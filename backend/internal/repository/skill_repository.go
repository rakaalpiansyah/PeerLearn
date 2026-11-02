package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

var ErrSkillNotFound = errors.New("repository: skill not found")

type SkillRepository interface {
	GetAll(ctx context.Context) ([]domain.Skill, error)
	FindByID(ctx context.Context, id uuid.UUID) (*domain.Skill, error)
	FindOrCreate(ctx context.Context, name, category string) (*domain.Skill, error)
}

type skillRepository struct {
	pool *pgxpool.Pool
}

func NewSkillRepository(pool *pgxpool.Pool) SkillRepository {
	return &skillRepository{pool: pool}
}

func (r *skillRepository) GetAll(ctx context.Context) ([]domain.Skill, error) {
	query := `
		SELECT id, name, category, created_at
		FROM skills
		ORDER BY category, name
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("skillRepository.GetAll: %w", err)
	}
	defer rows.Close()

	var skills []domain.Skill
	for rows.Next() {
		var s domain.Skill
		if err := rows.Scan(&s.ID, &s.Name, &s.Category, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("skillRepository.GetAll.Scan: %w", err)
		}
		skills = append(skills, s)
	}

	return skills, nil
}

func (r *skillRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Skill, error) {
	query := `
		SELECT id, name, category, created_at
		FROM skills
		WHERE id = $1
	`
	var s domain.Skill
	err := r.pool.QueryRow(ctx, query, id).Scan(&s.ID, &s.Name, &s.Category, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSkillNotFound
		}
		return nil, fmt.Errorf("skillRepository.FindByID: %w", err)
	}
	return &s, nil
}

func (r *skillRepository) FindOrCreate(ctx context.Context, name, category string) (*domain.Skill, error) {
	name = strings.TrimSpace(name)
	if category == "" {
		category = "Teknologi"
	}

	query := `
		INSERT INTO skills (id, name, category, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
		RETURNING id, name, category, created_at
	`
	newID := uuid.New()
	now := time.Now().UTC()

	var s domain.Skill
	err := r.pool.QueryRow(ctx, query, newID, name, category, now).Scan(&s.ID, &s.Name, &s.Category, &s.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("skillRepository.FindOrCreate: %w", err)
	}
	return &s, nil
}
