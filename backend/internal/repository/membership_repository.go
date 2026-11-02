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
	ErrMembershipNotFound = errors.New("repository: membership not found")
	ErrAlreadyJoined      = errors.New("repository: user already joined or requested this group")
)

type MembershipRepository interface {
	Create(ctx context.Context, m *domain.Membership) error
	Find(ctx context.Context, groupID, userID uuid.UUID) (*domain.Membership, error)
	FindByID(ctx context.Context, id uuid.UUID) (*domain.Membership, error)
	ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.Membership, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Membership, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.MembershipStatus) error
	CountAccepted(ctx context.Context, groupID uuid.UUID) (int, error)
}

type membershipRepository struct {
	pool *pgxpool.Pool
}

func NewMembershipRepository(pool *pgxpool.Pool) MembershipRepository {
	return &membershipRepository{pool: pool}
}

func (r *membershipRepository) Create(ctx context.Context, m *domain.Membership) error {
	query := `
		INSERT INTO memberships (id, group_id, user_id, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	now := time.Now().UTC()
	m.CreatedAt = now
	m.UpdatedAt = now
	if m.Status == "" {
		m.Status = domain.MembershipPending
	}

	_, err := r.pool.Exec(ctx, query, m.ID, m.GroupID, m.UserID, m.Status, m.CreatedAt, m.UpdatedAt)
	if err != nil {
		return fmt.Errorf("membershipRepository.Create: %w", err)
	}
	return nil
}

func (r *membershipRepository) Find(ctx context.Context, groupID, userID uuid.UUID) (*domain.Membership, error) {
	query := `
		SELECT id, group_id, user_id, status, created_at, updated_at
		FROM memberships
		WHERE group_id = $1 AND user_id = $2
	`
	var m domain.Membership
	err := r.pool.QueryRow(ctx, query, groupID, userID).Scan(
		&m.ID,
		&m.GroupID,
		&m.UserID,
		&m.Status,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMembershipNotFound
		}
		return nil, fmt.Errorf("membershipRepository.Find: %w", err)
	}
	return &m, nil
}

func (r *membershipRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Membership, error) {
	query := `
		SELECT id, group_id, user_id, status, created_at, updated_at
		FROM memberships
		WHERE id = $1
	`
	var m domain.Membership
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&m.ID,
		&m.GroupID,
		&m.UserID,
		&m.Status,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMembershipNotFound
		}
		return nil, fmt.Errorf("membershipRepository.FindByID: %w", err)
	}
	return &m, nil
}

func (r *membershipRepository) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.Membership, error) {
	query := `
		SELECT 
			m.id, m.group_id, m.user_id, m.status, m.created_at, m.updated_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.bio, u.avatar_url, u.contribution_points, u.created_at
		FROM memberships m
		JOIN users u ON m.user_id = u.id
		WHERE m.group_id = $1
		ORDER BY m.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("membershipRepository.ListByGroup: %w", err)
	}
	defer rows.Close()

	var list []domain.Membership
	for rows.Next() {
		var m domain.Membership
		var u domain.User
		err := rows.Scan(
			&m.ID,
			&m.GroupID,
			&m.UserID,
			&m.Status,
			&m.CreatedAt,
			&m.UpdatedAt,
			&u.ID,
			&u.Email,
			&u.FullName,
			&u.Role,
			&u.CampusName,
			&u.Bio,
			&u.AvatarURL,
			&u.ContributionPoints,
			&u.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("membershipRepository.ListByGroup.Scan: %w", err)
		}
		m.User = &u
		list = append(list, m)
	}
	return list, nil
}

func (r *membershipRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Membership, error) {
	query := `
		SELECT m.id, m.group_id, m.user_id, m.status, m.created_at, m.updated_at
		FROM memberships m
		WHERE m.user_id = $1
		ORDER BY m.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("membershipRepository.ListByUser: %w", err)
	}
	defer rows.Close()

	var list []domain.Membership
	for rows.Next() {
		var m domain.Membership
		if err := rows.Scan(&m.ID, &m.GroupID, &m.UserID, &m.Status, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("membershipRepository.ListByUser.Scan: %w", err)
		}
		list = append(list, m)
	}
	return list, nil
}

func (r *membershipRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.MembershipStatus) error {
	query := `
		UPDATE memberships
		SET status = $1, updated_at = $2
		WHERE id = $3
	`
	cmd, err := r.pool.Exec(ctx, query, status, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("membershipRepository.UpdateStatus: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrMembershipNotFound
	}
	return nil
}

func (r *membershipRepository) CountAccepted(ctx context.Context, groupID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM memberships WHERE group_id = $1 AND status = 'accepted'", groupID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("membershipRepository.CountAccepted: %w", err)
	}
	return count, nil
}
