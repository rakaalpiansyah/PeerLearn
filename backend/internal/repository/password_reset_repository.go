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

var ErrOTPNotFound = errors.New("repository: active otp not found")

type PasswordResetRepository interface {
	InvalidateActiveByUser(ctx context.Context, userID uuid.UUID) error
	CreateOTP(ctx context.Context, otp *domain.PasswordResetOTP) error
	FindLatestActiveByUser(ctx context.Context, userID uuid.UUID) (*domain.PasswordResetOTP, error)
	IncrementAttempts(ctx context.Context, id uuid.UUID) error
	MarkUsed(ctx context.Context, id uuid.UUID) error
	UpdateUserPasswordHash(ctx context.Context, userID uuid.UUID, passwordHash string) error
}

type passwordResetRepository struct {
	pool *pgxpool.Pool
}

func NewPasswordResetRepository(pool *pgxpool.Pool) PasswordResetRepository {
	return &passwordResetRepository{pool: pool}
}

func (r *passwordResetRepository) InvalidateActiveByUser(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE password_reset_otps
		SET used_at = $1
		WHERE user_id = $2 AND used_at IS NULL
	`, time.Now().UTC(), userID)
	if err != nil {
		return fmt.Errorf("passwordResetRepository.InvalidateActiveByUser: %w", err)
	}
	return nil
}

func (r *passwordResetRepository) CreateOTP(ctx context.Context, otp *domain.PasswordResetOTP) error {
	if otp.ID == uuid.Nil {
		otp.ID = uuid.New()
	}
	otp.CreatedAt = time.Now().UTC()

	_, err := r.pool.Exec(ctx, `
		INSERT INTO password_reset_otps (id, user_id, otp_hash, expires_at, attempts, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, otp.ID, otp.UserID, otp.OTPHash, otp.ExpiresAt, otp.Attempts, otp.CreatedAt)
	if err != nil {
		return fmt.Errorf("passwordResetRepository.CreateOTP: %w", err)
	}
	return nil
}

func (r *passwordResetRepository) FindLatestActiveByUser(ctx context.Context, userID uuid.UUID) (*domain.PasswordResetOTP, error) {
	var rec domain.PasswordResetOTP
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, otp_hash, expires_at, attempts, used_at, created_at
		FROM password_reset_otps
		WHERE user_id = $1 AND used_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1
	`, userID).Scan(
		&rec.ID,
		&rec.UserID,
		&rec.OTPHash,
		&rec.ExpiresAt,
		&rec.Attempts,
		&rec.UsedAt,
		&rec.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOTPNotFound
		}
		return nil, fmt.Errorf("passwordResetRepository.FindLatestActiveByUser: %w", err)
	}
	return &rec, nil
}

func (r *passwordResetRepository) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE password_reset_otps
		SET attempts = attempts + 1
		WHERE id = $1
	`, id)
	if err != nil {
		return fmt.Errorf("passwordResetRepository.IncrementAttempts: %w", err)
	}
	return nil
}

func (r *passwordResetRepository) MarkUsed(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE password_reset_otps
		SET used_at = $1
		WHERE id = $2
	`, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("passwordResetRepository.MarkUsed: %w", err)
	}
	return nil
}

func (r *passwordResetRepository) UpdateUserPasswordHash(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	cmd, err := r.pool.Exec(ctx, `
		UPDATE users
		SET password_hash = $1, updated_at = $2
		WHERE id = $3
	`, passwordHash, time.Now().UTC(), userID)
	if err != nil {
		return fmt.Errorf("passwordResetRepository.UpdateUserPasswordHash: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}