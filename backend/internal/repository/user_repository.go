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

var (
	ErrUserNotFound      = errors.New("repository: user not found")
	ErrUserAlreadyExists = errors.New("repository: email already registered")
)

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	FindByEmail(ctx context.Context, email string) (*domain.User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	UpdateProfile(ctx context.Context, user *domain.User) error
	UpdateAccountStatus(ctx context.Context, id uuid.UUID, status domain.AccountStatus, note string) error
	GetUserSkills(ctx context.Context, userID uuid.UUID) ([]domain.UserSkill, error)
	SyncUserSkills(ctx context.Context, userID uuid.UUID, skills []domain.UserSkill) error
}

type userRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) UserRepository {
	return &userRepository{pool: pool}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, full_name, role, campus_name, gender, bio, avatar_url, contribution_points, account_status, restriction_note, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	if user.AccountStatus == "" {
		user.AccountStatus = domain.AccountActive
	}
	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := r.pool.Exec(ctx, query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.FullName,
		user.Role,
		user.CampusName,
		user.Gender,
		user.Bio,
		user.AvatarURL,
		user.ContributionPoints,
		user.AccountStatus,
		user.RestrictionNote,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("userRepository.Create: %w", err)
	}
	return nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, role, campus_name, gender, bio, avatar_url, contribution_points, account_status, restriction_note, created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1)
	`
	var u domain.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.FullName,
		&u.Role,
		&u.CampusName,
		&u.Gender,
		&u.Bio,
		&u.AvatarURL,
		&u.ContributionPoints,
		&u.AccountStatus,
		&u.RestrictionNote,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("userRepository.FindByEmail: %w", err)
	}
	return &u, nil
}

func (r *userRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, role, campus_name, gender, bio, avatar_url, contribution_points, account_status, restriction_note, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var u domain.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.FullName,
		&u.Role,
		&u.CampusName,
		&u.Gender,
		&u.Bio,
		&u.AvatarURL,
		&u.ContributionPoints,
		&u.AccountStatus,
		&u.RestrictionNote,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("userRepository.FindByID: %w", err)
	}
	return &u, nil
}

func (r *userRepository) UpdateProfile(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users
		SET full_name = $1, campus_name = $2, gender = $3, bio = $4, avatar_url = $5, updated_at = $6
		WHERE id = $7
	`
	user.UpdatedAt = time.Now().UTC()
	cmd, err := r.pool.Exec(ctx, query,
		user.FullName,
		user.CampusName,
		user.Gender,
		user.Bio,
		user.AvatarURL,
		user.UpdatedAt,
		user.ID,
	)

	if err != nil {
		return fmt.Errorf("userRepository.UpdateProfile: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *userRepository) UpdateAccountStatus(ctx context.Context, id uuid.UUID, status domain.AccountStatus, note string) error {
	query := `
		UPDATE users
		SET account_status = $1, restriction_note = $2, updated_at = $3
		WHERE id = $4
	`
	cmd, err := r.pool.Exec(ctx, query, status, note, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("userRepository.UpdateAccountStatus: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *userRepository) GetUserSkills(ctx context.Context, userID uuid.UUID) ([]domain.UserSkill, error) {
	query := `
		SELECT us.user_id, us.skill_id, us.skill_type, s.name, s.category
		FROM user_skills us
		JOIN skills s ON us.skill_id = s.id
		WHERE us.user_id = $1
		ORDER BY us.skill_type, s.name
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("userRepository.GetUserSkills: %w", err)
	}
	defer rows.Close()

	var skills []domain.UserSkill
	for rows.Next() {
		var us domain.UserSkill
		var s domain.Skill
		if err := rows.Scan(&us.UserID, &us.SkillID, &us.SkillType, &s.Name, &s.Category); err != nil {
			return nil, fmt.Errorf("userRepository.GetUserSkills.Scan: %w", err)
		}
		s.ID = us.SkillID
		us.Skill = &s
		skills = append(skills, us)
	}

	return skills, nil
}

func (r *userRepository) SyncUserSkills(ctx context.Context, userID uuid.UUID, skills []domain.UserSkill) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("userRepository.SyncUserSkills.Begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, "DELETE FROM user_skills WHERE user_id = $1", userID); err != nil {
		return fmt.Errorf("userRepository.SyncUserSkills.Delete: %w", err)
	}

	insertQuery := `
		INSERT INTO user_skills (user_id, skill_id, skill_type, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, skill_id, skill_type) DO NOTHING
	`
	now := time.Now().UTC()
	for _, s := range skills {
		if _, err := tx.Exec(ctx, insertQuery, userID, s.SkillID, s.SkillType, now); err != nil {
			return fmt.Errorf("userRepository.SyncUserSkills.Insert: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("userRepository.SyncUserSkills.Commit: %w", err)
	}
	return nil
}
