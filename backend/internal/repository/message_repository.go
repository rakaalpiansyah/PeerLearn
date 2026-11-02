package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

type MessageRepository interface {
	Create(ctx context.Context, msg *domain.GroupMessage) error
	ListByGroup(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]domain.GroupMessageResponse, error)
}

type messageRepository struct {
	pool *pgxpool.Pool
}

func NewMessageRepository(pool *pgxpool.Pool) MessageRepository {
	return &messageRepository{pool: pool}
}

func (r *messageRepository) Create(ctx context.Context, msg *domain.GroupMessage) error {
	query := `
		INSERT INTO group_messages (id, group_id, sender_id, message, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	if msg.ID == uuid.Nil {
		msg.ID = uuid.New()
	}
	if msg.CreatedAt.IsZero() {
		msg.CreatedAt = time.Now().UTC()
	}

	_, err := r.pool.Exec(ctx, query, msg.ID, msg.GroupID, msg.SenderID, msg.Message, msg.CreatedAt)
	if err != nil {
		return fmt.Errorf("messageRepository.Create: %w", err)
	}
	return nil
}

func (r *messageRepository) ListByGroup(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]domain.GroupMessageResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT 
			m.id, m.group_id, m.sender_id, m.message, m.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.bio, u.avatar_url, u.contribution_points, u.created_at
		FROM group_messages m
		JOIN users u ON m.sender_id = u.id
		WHERE m.group_id = $1
		ORDER BY m.created_at ASC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, groupID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("messageRepository.ListByGroup: %w", err)
	}
	defer rows.Close()

	var list []domain.GroupMessageResponse
	for rows.Next() {
		var resp domain.GroupMessageResponse
		var sender domain.UserResponse
		err := rows.Scan(
			&resp.ID,
			&resp.GroupID,
			&resp.SenderID,
			&resp.Message,
			&resp.CreatedAt,
			&sender.ID,
			&sender.Email,
			&sender.FullName,
			&sender.Role,
			&sender.CampusName,
			&sender.Bio,
			&sender.AvatarURL,
			&sender.ContributionPoints,
			&sender.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("messageRepository.ListByGroup scan: %w", err)
		}
		resp.Sender = &sender
		list = append(list, resp)
	}

	return list, nil
}
