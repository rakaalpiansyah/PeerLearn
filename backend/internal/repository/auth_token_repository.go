package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

var ErrTokenNotFound = errors.New("repository: auth token not found or expired")

type AuthTokenRepository interface {
	Create(ctx context.Context, token *domain.AuthToken) error
	FindValidByHash(ctx context.Context, hash, purpose string) (*domain.AuthToken, error)
	MarkUsed(ctx context.Context, id uuid.UUID) error
	InvalidateActiveForUser(ctx context.Context, userID uuid.UUID, purpose string) error
}

type authTokenRepository struct {
	pool *pgxpool.Pool
}

func NewAuthTokenRepository(pool *pgxpool.Pool) AuthTokenRepository {
	return &authTokenRepository{pool: pool}
}

func (r *authTokenRepository) Create(ctx context.Context, token *domain.AuthToken) error {
	if token.ID == uuid.Nil {
		token.ID = uuid.New()
	}
	token.CreatedAt = time.Now().UTC()
	query := `
		INSERT INTO auth_tokens (id, user_id, token_hash, purpose, expires_at, used_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	if _, err := r.pool.Exec(ctx, query, token.ID, token.UserID, token.TokenHash, token.Purpose, token.ExpiresAt, token.UsedAt, token.CreatedAt); err != nil {
		return fmt.Errorf("authTokenRepository.Create: %w", err)
	}
	return nil
}

func (r *authTokenRepository) FindValidByHash(ctx context.Context, hash, purpose string) (*domain.AuthToken, error) {
	query := `
		SELECT id, user_id, token_hash, purpose, expires_at, used_at, created_at
		FROM auth_tokens
		WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()
	`
	var t domain.AuthToken
	err := r.pool.QueryRow(ctx, query, hash, purpose).Scan(
		&t.ID, &t.UserID, &t.TokenHash, &t.Purpose, &t.ExpiresAt, &t.UsedAt, &t.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTokenNotFound
		}
		return nil, fmt.Errorf("authTokenRepository.FindValidByHash: %w", err)
	}
	return &t, nil
}

func (r *authTokenRepository) MarkUsed(ctx context.Context, id uuid.UUID) error {
	cmd, err := r.pool.Exec(ctx, `UPDATE auth_tokens SET used_at = $1 WHERE id = $2`, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("authTokenRepository.MarkUsed: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrTokenNotFound
	}
	return nil
}

func (r *authTokenRepository) InvalidateActiveForUser(ctx context.Context, userID uuid.UUID, purpose string) error {
	if _, err := r.pool.Exec(ctx, `
		UPDATE auth_tokens
		SET used_at = $1
		WHERE user_id = $2 AND purpose = $3 AND used_at IS NULL
	`, time.Now().UTC(), userID, purpose); err != nil {
		return fmt.Errorf("authTokenRepository.InvalidateActiveForUser: %w", err)
	}
	return nil
}
