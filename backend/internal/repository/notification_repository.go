package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

var ErrNotificationNotFound = errors.New("repository: notification not found")

type NotificationRepository interface {
	Create(ctx context.Context, n *domain.Notification) error
	ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Notification, error)
	CountUnread(ctx context.Context, userID uuid.UUID) (int, error)
	MarkRead(ctx context.Context, id, userID uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
}

type notificationRepository struct {
	pool *pgxpool.Pool
}

func NewNotificationRepository(pool *pgxpool.Pool) NotificationRepository {
	return &notificationRepository{pool: pool}
}

func (r *notificationRepository) Create(ctx context.Context, n *domain.Notification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now().UTC()
	}

	query := `
		INSERT INTO notifications (id, user_id, type, title, message, related_group_id, is_read, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.pool.Exec(ctx, query, n.ID, n.UserID, n.Type, n.Title, n.Message, n.RelatedGroupID, n.IsRead, n.CreatedAt)
	if err != nil {
		return fmt.Errorf("notificationRepository.Create: %w", err)
	}
	return nil
}

func (r *notificationRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Notification, error) {
	if limit <= 0 {
		limit = 30
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT id, user_id, type, title, message, related_group_id, is_read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("notificationRepository.ListByUser: %w", err)
	}
	defer rows.Close()

	notifications := make([]domain.Notification, 0)
	for rows.Next() {
		var item domain.Notification
		err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Type,
			&item.Title,
			&item.Message,
			&item.RelatedGroupID,
			&item.IsRead,
			&item.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("notificationRepository.ListByUser.Scan: %w", err)
		}
		notifications = append(notifications, item)
	}
	return notifications, nil
}

func (r *notificationRepository) CountUnread(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE", userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("notificationRepository.CountUnread: %w", err)
	}
	return count, nil
}

func (r *notificationRepository) MarkRead(ctx context.Context, id, userID uuid.UUID) error {
	cmd, err := r.pool.Exec(ctx, "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return fmt.Errorf("notificationRepository.MarkRead: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotificationNotFound
	}
	return nil
}

func (r *notificationRepository) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE", userID)
	if err != nil {
		return fmt.Errorf("notificationRepository.MarkAllRead: %w", err)
	}
	return nil
}
