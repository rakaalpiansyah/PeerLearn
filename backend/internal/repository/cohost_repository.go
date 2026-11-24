package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

type GroupCoHostRepository interface {
	Add(ctx context.Context, groupID, userID, addedBy uuid.UUID) error
	Remove(ctx context.Context, groupID, userID uuid.UUID) error
	ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.GroupCoHost, error)
	ListByGroupIDs(ctx context.Context, groupIDs []uuid.UUID) (map[uuid.UUID][]domain.GroupCoHost, error)
	ListGroupIDsByUser(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error)
	IsCoHost(ctx context.Context, groupID, userID uuid.UUID) (bool, error)
}

type groupCoHostRepository struct {
	pool *pgxpool.Pool
}

func NewGroupCoHostRepository(pool *pgxpool.Pool) GroupCoHostRepository {
	return &groupCoHostRepository{pool: pool}
}

func (r *groupCoHostRepository) Add(ctx context.Context, groupID, userID, addedBy uuid.UUID) error {
	query := `
		INSERT INTO group_cohosts (group_id, user_id, added_by, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (group_id, user_id) DO NOTHING
	`
	if _, err := r.pool.Exec(ctx, query, groupID, userID, addedBy, time.Now().UTC()); err != nil {
		return fmt.Errorf("groupCoHostRepository.Add: %w", err)
	}
	return nil
}

func (r *groupCoHostRepository) Remove(ctx context.Context, groupID, userID uuid.UUID) error {
	query := `DELETE FROM group_cohosts WHERE group_id = $1 AND user_id = $2`
	if _, err := r.pool.Exec(ctx, query, groupID, userID); err != nil {
		return fmt.Errorf("groupCoHostRepository.Remove: %w", err)
	}
	return nil
}

func (r *groupCoHostRepository) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.GroupCoHost, error) {
	byGroup, err := r.ListByGroupIDs(ctx, []uuid.UUID{groupID})
	if err != nil {
		return nil, err
	}
	list := byGroup[groupID]
	if list == nil {
		return []domain.GroupCoHost{}, nil
	}
	return list, nil
}

func (r *groupCoHostRepository) ListByGroupIDs(ctx context.Context, groupIDs []uuid.UUID) (map[uuid.UUID][]domain.GroupCoHost, error) {
	result := make(map[uuid.UUID][]domain.GroupCoHost)
	if len(groupIDs) == 0 {
		return result, nil
	}

	query := `
		SELECT
			gc.group_id, gc.user_id, gc.added_by, gc.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.bio, u.avatar_url, u.contribution_points, u.created_at
		FROM group_cohosts gc
		JOIN users u ON gc.user_id = u.id
		WHERE gc.group_id = ANY($1)
		ORDER BY gc.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, groupIDs)
	if err != nil {
		return nil, fmt.Errorf("groupCoHostRepository.ListByGroupIDs: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var ch domain.GroupCoHost
		var u domain.UserResponse
		if err := rows.Scan(
			&ch.GroupID, &ch.UserID, &ch.AddedBy, &ch.CreatedAt,
			&u.ID, &u.Email, &u.FullName, &u.Role, &u.CampusName, &u.Bio, &u.AvatarURL, &u.ContributionPoints, &u.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("groupCoHostRepository.ListByGroupIDs.Scan: %w", err)
		}
		ch.User = &u
		result[ch.GroupID] = append(result[ch.GroupID], ch)
	}
	return result, nil
}

func (r *groupCoHostRepository) ListGroupIDsByUser(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `SELECT group_id FROM group_cohosts WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("groupCoHostRepository.ListGroupIDsByUser: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var gid uuid.UUID
		if err := rows.Scan(&gid); err != nil {
			return nil, fmt.Errorf("groupCoHostRepository.ListGroupIDsByUser.Scan: %w", err)
		}
		ids = append(ids, gid)
	}
	return ids, nil
}

func (r *groupCoHostRepository) IsCoHost(ctx context.Context, groupID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM group_cohosts WHERE group_id = $1 AND user_id = $2)`, groupID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("groupCoHostRepository.IsCoHost: %w", err)
	}
	return exists, nil
}
