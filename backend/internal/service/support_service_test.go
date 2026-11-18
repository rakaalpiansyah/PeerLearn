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

type mockSupportRepo struct {
	threads  map[uuid.UUID]*domain.SupportThreadResponse
	messages map[uuid.UUID][]domain.SupportMessageResponse
}

func newMockSupportRepo() *mockSupportRepo {
	return &mockSupportRepo{
		threads:  make(map[uuid.UUID]*domain.SupportThreadResponse),
		messages: make(map[uuid.UUID][]domain.SupportMessageResponse),
	}
}

func (m *mockSupportRepo) GetOrCreateThreadByStudent(ctx context.Context, studentID uuid.UUID, subject string) (*domain.SupportThread, error) {
	for _, t := range m.threads {
		if t.StudentID == studentID {
			return &domain.SupportThread{
				ID:            t.ID,
				StudentID:     t.StudentID,
				Subject:       t.Subject,
				Status:        t.Status,
				LastMessageAt: t.LastMessageAt,
				CreatedAt:     t.CreatedAt,
			}, nil
		}
	}
	id := uuid.New()
	now := time.Now().UTC()
	m.threads[id] = &domain.SupportThreadResponse{
		ID:            id,
		StudentID:     studentID,
		Subject:       subject,
		Status:        domain.SupportThreadOpen,
		LastMessageAt: now,
		CreatedAt:     now,
	}
	return &domain.SupportThread{
		ID:            id,
		StudentID:     studentID,
		Subject:       subject,
		Status:        domain.SupportThreadOpen,
		LastMessageAt: now,
		CreatedAt:     now,
	}, nil
}

func (m *mockSupportRepo) GetThreadByStudent(ctx context.Context, studentID uuid.UUID) (*domain.SupportThreadResponse, error) {
	for _, t := range m.threads {
		if t.StudentID == studentID {
			copyT := *t
			copyT.Messages = m.messages[t.ID]
			return &copyT, nil
		}
	}
	return nil, repository.ErrSupportThreadNotFound
}

func (m *mockSupportRepo) GetThreadByID(ctx context.Context, threadID uuid.UUID) (*domain.SupportThreadResponse, error) {
	t, ok := m.threads[threadID]
	if !ok {
		return nil, repository.ErrSupportThreadNotFound
	}
	copyT := *t
	copyT.Messages = m.messages[threadID]
	return &copyT, nil
}

func (m *mockSupportRepo) ListThreadsForAdmin(ctx context.Context, statusFilter string) ([]domain.SupportThreadResponse, error) {
	var out []domain.SupportThreadResponse
	for _, t := range m.threads {
		if statusFilter != "" && statusFilter != "all" && string(t.Status) != statusFilter {
			continue
		}
		out = append(out, *t)
	}
	return out, nil
}

func (m *mockSupportRepo) CreateMessage(ctx context.Context, msg *domain.SupportMessage, reopenThread bool) (*domain.SupportMessageResponse, error) {
	t, ok := m.threads[msg.ThreadID]
	if !ok {
		return nil, repository.ErrSupportThreadNotFound
	}
	if reopenThread {
		t.Status = domain.SupportThreadOpen
	}
	resp := domain.SupportMessageResponse{
		ID:        msg.ID,
		ThreadID:  msg.ThreadID,
		SenderID:  msg.SenderID,
		Message:   msg.Message,
		CreatedAt: time.Now().UTC(),
	}
	m.messages[msg.ThreadID] = append(m.messages[msg.ThreadID], resp)
	t.MessageCount = len(m.messages[msg.ThreadID])
	t.LastMessage = msg.Message
	return &resp, nil
}

func (m *mockSupportRepo) ListMessagesByThread(ctx context.Context, threadID uuid.UUID) ([]domain.SupportMessageResponse, error) {
	return m.messages[threadID], nil
}

func (m *mockSupportRepo) UpdateThreadStatus(ctx context.Context, threadID uuid.UUID, status domain.SupportThreadStatus) error {
	t, ok := m.threads[threadID]
	if !ok {
		return repository.ErrSupportThreadNotFound
	}
	t.Status = status
	return nil
}

func TestSupportService_StudentAndMultiAdminFlow(t *testing.T) {
	repo := newMockSupportRepo()
	svc := service.NewSupportService(repo, nil)
	ctx := context.Background()

	studentID := uuid.New()
	adminA := uuid.New()
	adminB := uuid.New()

	// Reject empty message
	_, err := svc.SendStudentMessage(ctx, studentID, domain.CreateSupportMessageRequest{Message: "   "})
	if !errors.Is(err, service.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for empty student message, got %v", err)
	}

	// Student sends message -> creates open thread
	msg1, err := svc.SendStudentMessage(ctx, studentID, domain.CreateSupportMessageRequest{
		Subject: "ACC Sesi Labkom",
		Message: "Mohon izin tanya syarat verifikasi sesi",
	})
	if err != nil {
		t.Fatalf("SendStudentMessage failed: %v", err)
	}

	// Any admin can list and reply
	threads, err := svc.AdminListThreads(ctx, "open")
	if err != nil || len(threads) != 1 {
		t.Fatalf("expected 1 open thread, got %+v, err=%v", threads, err)
	}

	_, err = svc.AdminReplyMessage(ctx, adminA, msg1.ThreadID, "   ")
	if !errors.Is(err, service.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for empty admin reply, got %v", err)
	}

	if _, err := svc.AdminReplyMessage(ctx, adminA, msg1.ThreadID, "Halo, silakan lengkapi agenda."); err != nil {
		t.Fatalf("Admin A reply failed: %v", err)
	}
	if _, err := svc.AdminReplyMessage(ctx, adminB, msg1.ThreadID, "Sudah saya bantu ACC ya."); err != nil {
		t.Fatalf("Admin B reply failed: %v", err)
	}

	// Resolve thread, then student sends follow-up which reopens thread
	if err := svc.AdminUpdateThreadStatus(ctx, msg1.ThreadID, domain.SupportThreadResolved); err != nil {
		t.Fatalf("AdminUpdateThreadStatus failed: %v", err)
	}
	resolved, _ := svc.AdminGetThreadMessages(ctx, msg1.ThreadID)
	if resolved.Status != domain.SupportThreadResolved || len(resolved.Messages) != 3 {
		t.Fatalf("expected resolved thread with 3 messages, got status=%s len=%d", resolved.Status, len(resolved.Messages))
	}

	if _, err := svc.SendStudentMessage(ctx, studentID, domain.CreateSupportMessageRequest{Message: "Terima kasih, ada kendala baru."}); err != nil {
		t.Fatalf("student follow-up failed: %v", err)
	}
	reopened, _ := svc.GetMyThread(ctx, studentID)
	if reopened.Status != domain.SupportThreadOpen || len(reopened.Messages) != 4 {
		t.Fatalf("expected reopened thread with 4 messages, got status=%s len=%d", reopened.Status, len(reopened.Messages))
	}
}
