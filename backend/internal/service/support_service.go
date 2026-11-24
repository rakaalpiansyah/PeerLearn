package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

type SupportService interface {
	SetNotifier(notifier NotificationDispatcher)
	GetMyThread(ctx context.Context, studentID uuid.UUID) (*domain.SupportThreadResponse, error)
	SendStudentMessage(ctx context.Context, studentID uuid.UUID, req domain.CreateSupportMessageRequest) (*domain.SupportMessageResponse, error)
	AdminListThreads(ctx context.Context, statusFilter string) ([]domain.SupportThreadResponse, error)
	AdminGetThreadMessages(ctx context.Context, threadID uuid.UUID) (*domain.SupportThreadResponse, error)
	AdminReplyMessage(ctx context.Context, adminID, threadID uuid.UUID, message string) (*domain.SupportMessageResponse, error)
	AdminUpdateThreadStatus(ctx context.Context, threadID uuid.UUID, status domain.SupportThreadStatus) error
}

type supportService struct {
	supportRepo repository.SupportRepository
	userRepo    repository.UserRepository
	notifier    NotificationDispatcher
}

func (s *supportService) SetNotifier(notifier NotificationDispatcher) {
	s.notifier = notifier
}

func NewSupportService(supportRepo repository.SupportRepository, userRepo repository.UserRepository) SupportService {
	return &supportService{
		supportRepo: supportRepo,
		userRepo:    userRepo,
	}
}

func (s *supportService) GetMyThread(ctx context.Context, studentID uuid.UUID) (*domain.SupportThreadResponse, error) {
	thread, err := s.supportRepo.GetThreadByStudent(ctx, studentID)
	if err != nil {
		if errors.Is(err, repository.ErrSupportThreadNotFound) {
			created, createErr := s.supportRepo.GetOrCreateThreadByStudent(ctx, studentID, "Pertanyaan & Bantuan Akademik")
			if createErr != nil {
				return nil, fmt.Errorf("supportService.GetMyThread create: %w", createErr)
			}
			return s.supportRepo.GetThreadByID(ctx, created.ID)
		}
		return nil, fmt.Errorf("supportService.GetMyThread: %w", err)
	}
	return thread, nil
}

func (s *supportService) SendStudentMessage(ctx context.Context, studentID uuid.UUID, req domain.CreateSupportMessageRequest) (*domain.SupportMessageResponse, error) {
	msgText := strings.TrimSpace(req.Message)
	if msgText == "" {
		return nil, fmt.Errorf("%w: pesan tidak boleh kosong", ErrInvalidInput)
	}
	if len(msgText) > 2000 {
		return nil, fmt.Errorf("%w: pesan maksimal 2000 karakter", ErrInvalidInput)
	}

	subject := strings.TrimSpace(req.Subject)
	if subject == "" {
		subject = "Pertanyaan & Bantuan Akademik"
	}

	thread, err := s.supportRepo.GetOrCreateThreadByStudent(ctx, studentID, subject)
	if err != nil {
		return nil, fmt.Errorf("supportService.SendStudentMessage thread: %w", err)
	}

	msg := &domain.SupportMessage{
		ID:       uuid.New(),
		ThreadID: thread.ID,
		SenderID: studentID,
		Message:  msgText,
	}
	createdMsg, err := s.supportRepo.CreateMessage(ctx, msg, true)
	if err != nil {
		return nil, fmt.Errorf("supportService.SendStudentMessage create: %w", err)
	}
	return createdMsg, nil
}

func (s *supportService) AdminListThreads(ctx context.Context, statusFilter string) ([]domain.SupportThreadResponse, error) {
	return s.supportRepo.ListThreadsForAdmin(ctx, statusFilter)
}

func (s *supportService) AdminGetThreadMessages(ctx context.Context, threadID uuid.UUID) (*domain.SupportThreadResponse, error) {
	return s.supportRepo.GetThreadByID(ctx, threadID)
}

func (s *supportService) AdminReplyMessage(ctx context.Context, adminID, threadID uuid.UUID, message string) (*domain.SupportMessageResponse, error) {
	msgText := strings.TrimSpace(message)
	if msgText == "" {
		return nil, fmt.Errorf("%w: balasan pesan wajib diisi", ErrInvalidInput)
	}
	if len(msgText) > 2000 {
		return nil, fmt.Errorf("%w: balasan pesan maksimal 2000 karakter", ErrInvalidInput)
	}

	thread, err := s.supportRepo.GetThreadByID(ctx, threadID)
	if err != nil {
		return nil, fmt.Errorf("supportService.AdminReplyMessage lookup: %w", err)
	}

	msg := &domain.SupportMessage{
		ID:       uuid.New(),
		ThreadID: threadID,
		SenderID: adminID,
		Message:  msgText,
	}
	createdMsg, err := s.supportRepo.CreateMessage(ctx, msg, false)
	if err != nil {
		return nil, fmt.Errorf("supportService.AdminReplyMessage create: %w", err)
	}
	if s.notifier != nil {
		preview := msgText
		if len(preview) > 120 {
			preview = preview[:117] + "..."
		}
		_ = s.notifier.Notify(ctx, thread.StudentID, domain.NotificationSupportReply, "Balasan Baru dari Tim Admin", fmt.Sprintf("Admin membalas topik %q: %s", thread.Subject, preview), nil)
	}
	return createdMsg, nil
}

func (s *supportService) AdminUpdateThreadStatus(ctx context.Context, threadID uuid.UUID, status domain.SupportThreadStatus) error {
	if status != domain.SupportThreadOpen && status != domain.SupportThreadResolved {
		return fmt.Errorf("%w: status percakapan harus 'open' atau 'resolved'", ErrInvalidInput)
	}
	return s.supportRepo.UpdateThreadStatus(ctx, threadID, status)
}
