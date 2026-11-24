package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

type mockNotificationRepo struct {
	items []domain.Notification
}

func newMockNotificationRepo() *mockNotificationRepo {
	return &mockNotificationRepo{items: make([]domain.Notification, 0)}
}

func (m *mockNotificationRepo) Create(_ context.Context, n *domain.Notification) error {
	cp := *n
	if cp.CreatedAt.IsZero() {
		cp.CreatedAt = time.Now().UTC()
	}
	m.items = append([]domain.Notification{cp}, m.items...)
	return nil
}

func (m *mockNotificationRepo) ListByUser(_ context.Context, userID uuid.UUID, limit int) ([]domain.Notification, error) {
	if limit <= 0 {
		limit = 30
	}
	out := make([]domain.Notification, 0)
	for _, item := range m.items {
		if item.UserID == userID {
			out = append(out, item)
			if len(out) >= limit {
				break
			}
		}
	}
	return out, nil
}

func (m *mockNotificationRepo) CountUnread(_ context.Context, userID uuid.UUID) (int, error) {
	count := 0
	for _, item := range m.items {
		if item.UserID == userID && !item.IsRead {
			count++
		}
	}
	return count, nil
}

func (m *mockNotificationRepo) MarkRead(_ context.Context, id, userID uuid.UUID) error {
	for i := range m.items {
		if m.items[i].ID == id && m.items[i].UserID == userID {
			m.items[i].IsRead = true
			return nil
		}
	}
	return repository.ErrNotificationNotFound
}

func (m *mockNotificationRepo) MarkAllRead(_ context.Context, userID uuid.UUID) error {
	for i := range m.items {
		if m.items[i].UserID == userID {
			m.items[i].IsRead = true
		}
	}
	return nil
}

func TestNotificationService_FlowAndOwnership(t *testing.T) {
	ctx := context.Background()
	repo := newMockNotificationRepo()
	svc := service.NewNotificationService(repo)

	alice := uuid.New()
	bob := uuid.New()
	groupID := uuid.New()

	if err := svc.Notify(ctx, alice, domain.NotificationJoinRequest, "Permintaan Bergabung Baru", "Seseorang ingin bergabung", &groupID); err != nil {
		t.Fatalf("Notify failed: %v", err)
	}
	if err := svc.Notify(ctx, alice, domain.NotificationSessionApproved, "Sesi Disetujui", "Sesi Anda tayang", &groupID); err != nil {
		t.Fatalf("Notify 2 failed: %v", err)
	}
	if err := svc.Notify(ctx, bob, domain.NotificationSupportReply, "Balasan Admin", "Halo Bob", nil); err != nil {
		t.Fatalf("Notify Bob failed: %v", err)
	}

	res, err := svc.ListForUser(ctx, alice, 0)
	if err != nil {
		t.Fatalf("ListForUser failed: %v", err)
	}
	if len(res.Notifications) != 2 || res.UnreadCount != 2 {
		t.Fatalf("expected 2 unread notifications for Alice, got len=%d unread=%d", len(res.Notifications), res.UnreadCount)
	}

	// Bob cannot mark Alice's notification read
	err = svc.MarkRead(ctx, bob, res.Notifications[0].ID)
	if !errors.Is(err, repository.ErrNotificationNotFound) {
		t.Fatalf("expected ErrNotificationNotFound when non-owner calls MarkRead, got %v", err)
	}

	// Alice marks one read
	if err := svc.MarkRead(ctx, alice, res.Notifications[0].ID); err != nil {
		t.Fatalf("MarkRead failed: %v", err)
	}
	afterOne, _ := svc.ListForUser(ctx, alice, 10)
	if afterOne.UnreadCount != 1 {
		t.Errorf("expected unread count 1 after MarkRead, got %d", afterOne.UnreadCount)
	}

	// Alice marks all read
	if err := svc.MarkAllRead(ctx, alice); err != nil {
		t.Fatalf("MarkAllRead failed: %v", err)
	}
	afterAll, _ := svc.ListForUser(ctx, alice, 10)
	if afterAll.UnreadCount != 0 {
		t.Errorf("expected unread count 0 after MarkAllRead, got %d", afterAll.UnreadCount)
	}
}
