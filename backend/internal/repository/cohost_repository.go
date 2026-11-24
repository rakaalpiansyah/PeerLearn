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

var ErrCohostNotFound = errors.New("repository: cohost record not found")

type CohostRepository interface {
	Invite(ctx context.Context, cohost *domain.StudyGroupCohost) error
	ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.StudyGroupCohost, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.StudyGroupCohost, error)
	Find(ctx context.Context, groupID, userID uuid.UUID) (*domain.StudyGroupCohost, error)
	UpdateStatus(ctx context.Context, groupID, userID uuid.UUID, status domain.CohostStatus) error
	Remove(ctx context.Context, groupID, userID uuid.UUID) error
	CountActiveOrInvited(ctx context.Context, groupID uuid.UUID) (int, error)
	IsAcceptedCohost(ctx context.Context, groupID, userID uuid.UUID) (bool, error)
	ListAcceptedUserIDs(ctx context.Context, groupID uuid.UUID) ([]uuid.UUID, error)
}

type cohostRepository struct {
	pool *pgxpool.Pool
}

func NewCohostRepository(pool *pgxpool.Pool) CohostRepository {
	return &cohostRepository{pool: pool}
}

func (r *cohostRepository) Invite(ctx context.Context, cohost *domain.StudyGroupCohost) error {
	if cohost.ID == uuid.Nil {
		cohost.ID = uuid.New()
	}
	now := time.Now().UTC()
	cohost.CreatedAt = now
	cohost.UpdatedAt = now

	_, err := r.pool.Exec(ctx, `
		INSERT INTO study_group_cohosts (id, group_id, user_id, status, invited_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (group_id, user_id)
		DO UPDATE SET status = EXCLUDED.status, invited_by = EXCLUDED.invited_by, updated_at = EXCLUDED.updated_at
	`, cohost.ID, cohost.GroupID, cohost.UserID, cohost.Status, cohost.InvitedBy, cohost.CreatedAt, cohost.UpdatedAt)
	if err != nil {
		return fmt.Errorf("cohostRepository.Invite: %w", err)
	}
	return nil
}

func (r *cohostRepository) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.StudyGroupCohost, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			c.id, c.group_id, c.user_id, c.status, c.invited_by, c.created_at, c.updated_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.avatar_url, u.contribution_points
		FROM study_group_cohosts c
		JOIN users u ON c.user_id = u.id
		WHERE c.group_id = $1 AND c.status IN ('invited', 'accepted')
		ORDER BY CASE WHEN c.status = 'accepted' THEN 0 ELSE 1 END, c.created_at ASC
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("cohostRepository.ListByGroup: %w", err)
	}
	defer rows.Close()

	list := make([]domain.StudyGroupCohost, 0)
	for rows.Next() {
		var item domain.StudyGroupCohost
		var u domain.User
		if err := rows.Scan(
			&item.ID, &item.GroupID, &item.UserID, &item.Status, &item.InvitedBy, &item.CreatedAt, &item.UpdatedAt,
			&u.ID, &u.Email, &u.FullName, &u.Role, &u.CampusName, &u.AvatarURL, &u.ContributionPoints,
		); err != nil {
			return nil, fmt.Errorf("cohostRepository.ListByGroup.Scan: %w", err)
		}
		item.User = &u
		list = append(list, item)
	}
	return list, rows.Err()
}

func (r *cohostRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.StudyGroupCohost, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			c.id, c.group_id, c.user_id, c.status, c.invited_by, c.created_at, c.updated_at,
			g.title, g.status, g.start_time
		FROM study_group_cohosts c
		JOIN learning_groups g ON c.group_id = g.id
		WHERE c.user_id = $1 AND c.status IN ('invited', 'accepted')
		ORDER BY c.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("cohostRepository.ListByUser: %w", err)
	}
	defer rows.Close()

	list := make([]domain.StudyGroupCohost, 0)
	for rows.Next() {
		var item domain.StudyGroupCohost
		var startTime time.Time
		if err := rows.Scan(
			&item.ID, &item.GroupID, &item.UserID, &item.Status, &item.InvitedBy, &item.CreatedAt, &item.UpdatedAt,
			&item.GroupTitle, &item.GroupStatus, &startTime,
		); err != nil {
			return nil, fmt.Errorf("cohostRepository.ListByUser.Scan: %w", err)
		}
		item.StartTime = &startTime
		list = append(list, item)
	}
	return list, rows.Err()
}

func (r *cohostRepository) Find(ctx context.Context, groupID, userID uuid.UUID) (*domain.StudyGroupCohost, error) {
	var item domain.StudyGroupCohost
	err := r.pool.QueryRow(ctx, `
		SELECT id, group_id, user_id, status, invited_by, created_at, updated_at
		FROM study_group_cohosts
		WHERE group_id = $1 AND user_id = $2
	`, groupID, userID).Scan(
		&item.ID, &item.GroupID, &item.UserID, &item.Status, &item.InvitedBy, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCohostNotFound
		}
		return nil, fmt.Errorf("cohostRepository.Find: %w", err)
	}
	return &item, nil
}

func (r *cohostRepository) UpdateStatus(ctx context.Context, groupID, userID uuid.UUID, status domain.CohostStatus) error {
	cmd, err := r.pool.Exec(ctx, `
		UPDATE study_group_cohosts
		SET status = $1, updated_at = $2
		WHERE group_id = $3 AND user_id = $4
	`, status, time.Now().UTC(), groupID, userID)
	if err != nil {
		return fmt.Errorf("cohostRepository.UpdateStatus: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrCohostNotFound
	}
	return nil
}

func (r *cohostRepository) Remove(ctx context.Context, groupID, userID uuid.UUID) error {
	cmd, err := r.pool.Exec(ctx, `
		DELETE FROM study_group_cohosts
		WHERE group_id = $1 AND user_id = $2
	`, groupID, userID)
	if err != nil {
		return fmt.Errorf("cohostRepository.Remove: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrCohostNotFound
	}
	return nil
}

func (r *cohostRepository) CountActiveOrInvited(ctx context.Context, groupID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM study_group_cohosts
		WHERE group_id = $1 AND status IN ('invited', 'accepted')
	`, groupID).Scan(&count)
	return count, err
}

func (r *cohostRepository) IsAcceptedCohost(ctx context.Context, groupID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM study_group_cohosts
			WHERE group_id = $1 AND user_id = $2 AND status = 'accepted'
		)
	`, groupID, userID).Scan(&exists)
	return exists, err
}

func (r *cohostRepository) ListAcceptedUserIDs(ctx context.Context, groupID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT user_id
		FROM study_group_cohosts
		WHERE group_id = $1 AND status = 'accepted'
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]uuid.UUID, 0)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}