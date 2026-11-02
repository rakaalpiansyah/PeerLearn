package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthRepository interface {
	Ping(ctx context.Context) error
	GetTableCounts(ctx context.Context) (map[string]int, error)
}

type healthRepository struct {
	pool *pgxpool.Pool
}

func NewHealthRepository(pool *pgxpool.Pool) HealthRepository {
	return &healthRepository{pool: pool}
}

func (r *healthRepository) Ping(ctx context.Context) error {
	if r.pool == nil {
		return fmt.Errorf("database connection pool is nil")
	}
	ctxTimeout, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return r.pool.Ping(ctxTimeout)
}

func (r *healthRepository) GetTableCounts(ctx context.Context) (map[string]int, error) {
	counts := make(map[string]int)
	if r.pool == nil {
		return counts, nil
	}

	ctxTimeout, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var skillCount int
	err := r.pool.QueryRow(ctxTimeout, "SELECT COUNT(*) FROM skills").Scan(&skillCount)
	if err == nil {
		counts["skills"] = skillCount
	}

	var userCount int
	err = r.pool.QueryRow(ctxTimeout, "SELECT COUNT(*) FROM users").Scan(&userCount)
	if err == nil {
		counts["users"] = userCount
	}

	var groupCount int
	err = r.pool.QueryRow(ctxTimeout, "SELECT COUNT(*) FROM learning_groups").Scan(&groupCount)
	if err == nil {
		counts["learning_groups"] = groupCount
	}

	return counts, nil
}
