package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

type NotificationDispatcher interface {
	Notify(ctx context.Context, userID uuid.UUID, notifType domain.NotificationType, title, message string, relatedGroupID *uuid.UUID) error
}

type NotificationService interface {
	NotificationDispatcher
	ListForUser(ctx context.Context, userID uuid.UUID, limit int) (*domain.NotificationListResponse, error)
	MarkRead(ctx context.Context, userID, notificationID uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
}

type notificationService struct {
	repo repository.NotificationRepository
}

func NewNotificationService(repo repository.NotificationRepository) NotificationService {
	return &notificationService{repo: repo}
}

func (s *notificationService) Notify(
	ctx context.Context,
	userID uuid.UUID,
	notifType domain.NotificationType,
	title, message string,
	relatedGroupID *uuid.UUID,
) error {
	title = strings.TrimSpace(title)
	message = strings.TrimSpace(message)
	if userID == uuid.Nil || title == "" || message == "" {
		return fmt.Errorf("%w: data notifikasi tidak lengkap", ErrInvalidInput)
	}

	n := &domain.Notification{
		ID:             uuid.New(),
		UserID:         userID,
		Type:           notifType,
		Title:          title,
		Message:        message,
		RelatedGroupID: relatedGroupID,
		IsRead:         false,
	}
	if err := s.repo.Create(ctx, n); err != nil {
		return fmt.Errorf("notificationService.Notify: %w", err)
	}
	return nil
}

func (s *notificationService) ListForUser(ctx context.Context, userID uuid.UUID, limit int) (*domain.NotificationListResponse, error) {
	if limit <= 0 {
		limit = 30
	}
	if limit > 100 {
		limit = 100
	}

	items, err := s.repo.ListByUser(ctx, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("notificationService.ListForUser list: %w", err)
	}
	if items == nil {
		items = []domain.Notification{}
	}

	unread, err := s.repo.CountUnread(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("notificationService.ListForUser count: %w", err)
	}

	return &domain.NotificationListResponse{
		Notifications: items,
		UnreadCount:   unread,
	}, nil
}

func (s *notificationService) MarkRead(ctx context.Context, userID, notificationID uuid.UUID) error {
	if err := s.repo.MarkRead(ctx, notificationID, userID); err != nil {
		return fmt.Errorf("notificationService.MarkRead: %w", err)
	}
	return nil
}

func (s *notificationService) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	if err := s.repo.MarkAllRead(ctx, userID); err != nil {
		return fmt.Errorf("notificationService.MarkAllRead: %w", err)
	}
	return nil
}
