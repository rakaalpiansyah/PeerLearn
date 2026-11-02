package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func ConnectPostgres(databaseURL string) (*DB, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("database connection string is empty")
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %w", err)
	}

	// Serverless connection pool tuning for Neon PgBouncer
	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping neon postgres database: %w", err)
	}

	log.Println("[Database] Successfully connected to Neon PostgreSQL pool")
	return &DB{Pool: pool}, nil
}

func (db *DB) RunMigrations(migrationDir string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// If a file was passed directly, get its directory
	info, err := os.Stat(migrationDir)
	if err == nil && !info.IsDir() {
		migrationDir = filepath.Dir(migrationDir)
	}

	entries, err := os.ReadDir(migrationDir)
	if err != nil {
		// Fallback to internal/database/migrations
		migrationDir = filepath.Join("internal", "database", "migrations")
		entries, err = os.ReadDir(migrationDir)
		if err != nil {
			return fmt.Errorf("failed to read migrations directory: %w", err)
		}
	}

	for _, entry := range entries {
		if filepath.Ext(entry.Name()) == ".sql" {
			filePath := filepath.Join(migrationDir, entry.Name())
			sqlContent, err := os.ReadFile(filePath)
			if err != nil {
				return fmt.Errorf("failed to read migration file %s: %w", entry.Name(), err)
			}
			if _, err := db.Pool.Exec(ctx, string(sqlContent)); err != nil {
				return fmt.Errorf("failed to execute migration script %s: %w", entry.Name(), err)
			}
			log.Printf("[Database] Executed migration: %s", entry.Name())
		}
	}

	log.Println("[Database] All schema migrations executed successfully")
	return nil
}

func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}
