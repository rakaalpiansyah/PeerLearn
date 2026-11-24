package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

type StudyRequestFulfiller interface {
	FulfillFromGroup(ctx context.Context, requestID, groupID uuid.UUID, groupTitle string, tutorID uuid.UUID) error
}

type StudyRequestService interface {
	StudyRequestFulfiller
	SetNotifier(notifier NotificationDispatcher)
	List(ctx context.Context, filter domain.StudyRequestFilter, viewerID *uuid.UUID) ([]domain.StudyRequestResponse, error)
	Create(ctx context.Context, userID uuid.UUID, req domain.CreateStudyRequestPayload) (*domain.StudyRequestResponse, error)
	ToggleVote(ctx context.Context, requestID, userID uuid.UUID) (*domain.StudyRequestVoteResult, error)
}

type studyRequestService struct {
	repo     repository.StudyRequestRepository
	userRepo repository.UserRepository
	notifier NotificationDispatcher
}

func NewStudyRequestService(repo repository.StudyRequestRepository, userRepo repository.UserRepository) StudyRequestService {
	return &studyRequestService{
		repo:     repo,
		userRepo: userRepo,
	}
}

func (s *studyRequestService) SetNotifier(notifier NotificationDispatcher) {
	s.notifier = notifier
}

func (s *studyRequestService) List(ctx context.Context, filter domain.StudyRequestFilter, viewerID *uuid.UUID) ([]domain.StudyRequestResponse, error) {
	items, err := s.repo.List(ctx, filter, viewerID)
	if err != nil {
		return nil, fmt.Errorf("studyRequestService.List: %w", err)
	}
	return items, nil
}

func (s *studyRequestService) Create(ctx context.Context, userID uuid.UUID, req domain.CreateStudyRequestPayload) (*domain.StudyRequestResponse, error) {
	if userID == uuid.Nil {
		return nil, ErrUnauthorizedAction
	}
	if s.userRepo != nil {
		if u, err := s.userRepo.FindByID(ctx, userID); err == nil && u != nil {
			if u.AccountStatus == domain.AccountRestricted || u.AccountStatus == domain.AccountSuspended {
				return nil, fmt.Errorf("%w: status akun Anda saat ini tidak mengizinkan pengajuan usulan topik", ErrUnauthorizedAction)
			}
		}
	}

	title := strings.TrimSpace(req.Title)
	desc := strings.TrimSpace(req.Description)
	if len(title) < 3 || len(title) > 160 {
		return nil, fmt.Errorf("%w: judul topik belajar wajib 3 hingga 160 karakter", ErrInvalidInput)
	}
	if len(desc) > 1000 {
		return nil, fmt.Errorf("%w: deskripsi usulan topik maksimal 1.000 karakter", ErrInvalidInput)
	}

	category := strings.TrimSpace(req.Category)
	if category == "" {
		category = "Teknologi"
	}
	format := req.PreferredFormat
	if format != domain.FormatOnline && format != domain.FormatOffline {
		format = domain.FormatOnline
	}

	sr := &domain.StudyRequest{
		ID:              uuid.New(),
		RequesterID:     userID,
		Title:           title,
		Description:     desc,
		Category:        category,
		PreferredFormat: format,
		Status:          domain.StudyRequestOpen,
	}
	if err := s.repo.Create(ctx, sr); err != nil {
		return nil, fmt.Errorf("studyRequestService.Create: %w", err)
	}

	// Auto-vote creator's own request so support count starts at 1
	_, _, _ = s.repo.ToggleVote(ctx, sr.ID, userID)

	return s.repo.FindByID(ctx, sr.ID, &userID)
}

func (s *studyRequestService) ToggleVote(ctx context.Context, requestID, userID uuid.UUID) (*domain.StudyRequestVoteResult, error) {
	if userID == uuid.Nil {
		return nil, ErrUnauthorizedAction
	}
	if s.userRepo != nil {
		if u, err := s.userRepo.FindByID(ctx, userID); err == nil && u != nil {
			if u.AccountStatus == domain.AccountSuspended {
				return nil, fmt.Errorf("%w: akun ditangguhkan", ErrUnauthorizedAction)
			}
		}
	}

	existing, err := s.repo.FindByID(ctx, requestID, &userID)
	if err != nil || existing == nil {
		return nil, fmt.Errorf("%w: usulan topik tidak ditemukan", ErrInvalidInput)
	}

	voted, count, err := s.repo.ToggleVote(ctx, requestID, userID)
	if err != nil {
		return nil, fmt.Errorf("studyRequestService.ToggleVote: %w", err)
	}

	return &domain.StudyRequestVoteResult{
		RequestID: requestID,
		Voted:     voted,
		VoteCount: count,
	}, nil
}

func (s *studyRequestService) FulfillFromGroup(ctx context.Context, requestID, groupID uuid.UUID, groupTitle string, tutorID uuid.UUID) error {
	existing, err := s.repo.FindByID(ctx, requestID, nil)
	if err != nil || existing == nil {
		return fmt.Errorf("studyRequestService.FulfillFromGroup: %w", err)
	}

	if err := s.repo.MarkFulfilled(ctx, requestID, groupID); err != nil {
		return fmt.Errorf("studyRequestService.FulfillFromGroup mark: %w", err)
	}

	if s.notifier != nil {
		notified := map[uuid.UUID]bool{tutorID: true}
		recipients := []uuid.UUID{existing.RequesterID}
		if voters, vErr := s.repo.ListVoterIDs(ctx, requestID); vErr == nil {
			recipients = append(recipients, voters...)
		}
		gid := groupID
		for _, rid := range recipients {
			if rid == uuid.Nil || notified[rid] {
				continue
			}
			notified[rid] = true
			_ = s.notifier.Notify(ctx, rid, domain.NotificationRequestFulfilled, "Usulan Topik Dibuka", fmt.Sprintf("Usulan topik %q telah dibuka menjadi sesi %q dan sedang menunggu persetujuan admin.", existing.Title, groupTitle), &gid)
		}
	}
	return nil
}
