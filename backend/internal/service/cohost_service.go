package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

const maxCohostsPerGroup = 3

type CohostService interface {
	InviteByEmail(ctx context.Context, callerID, groupID uuid.UUID, email string) (*domain.StudyGroupCohost, error)
	RespondInvitation(ctx context.Context, userID, groupID uuid.UUID, status domain.CohostStatus) error
	RemoveCohost(ctx context.Context, callerID, groupID, targetUserID uuid.UUID) error
	ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.StudyGroupCohost, error)
	ListMyInvitations(ctx context.Context, userID uuid.UUID) ([]domain.StudyGroupCohost, error)
}

type cohostService struct {
	cohostRepo repository.CohostRepository
	groupRepo  repository.GroupRepository
	userRepo   repository.UserRepository
}

func NewCohostService(
	cohostRepo repository.CohostRepository,
	groupRepo repository.GroupRepository,
	userRepo repository.UserRepository,
) CohostService {
	return &cohostService{
		cohostRepo: cohostRepo,
		groupRepo:  groupRepo,
		userRepo:   userRepo,
	}
}

func (s *cohostService) InviteByEmail(ctx context.Context, callerID, groupID uuid.UUID, email string) (*domain.StudyGroupCohost, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" || !strings.Contains(email, "@") {
		return nil, fmt.Errorf("%w: alamat email Co-Tutor yang valid wajib diisi", ErrInvalidInput)
	}

	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if group.HostID != callerID {
		return nil, fmt.Errorf("%w: hanya penyelenggara utama yang dapat mengundang Co-Tutor", ErrUnauthorizedAction)
	}

	target, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil || target == nil {
		return nil, fmt.Errorf("%w: akun dengan email tersebut tidak ditemukan", ErrInvalidInput)
	}
	if target.ID == callerID {
		return nil, fmt.Errorf("%w: Anda sudah menjadi penyelenggara utama sesi ini", ErrInvalidInput)
	}
	if target.AccountStatus == domain.AccountSuspended {
		return nil, fmt.Errorf("%w: akun yang diundang sedang ditangguhkan", ErrInvalidInput)
	}

	existing, err := s.cohostRepo.Find(ctx, groupID, target.ID)
	if err == nil && existing != nil && (existing.Status == domain.CohostInvited || existing.Status == domain.CohostAccepted) {
		return nil, fmt.Errorf("%w: pengguna tersebut sudah diundang atau tergabung sebagai Co-Tutor", ErrInvalidInput)
	}

	count, err := s.cohostRepo.CountActiveOrInvited(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if count >= maxCohostsPerGroup {
		return nil, fmt.Errorf("%w: maksimal %d Co-Tutor per kelompok belajar", ErrInvalidInput, maxCohostsPerGroup)
	}

	record := &domain.StudyGroupCohost{
		ID:        uuid.New(),
		GroupID:   groupID,
		UserID:    target.ID,
		Status:    domain.CohostInvited,
		InvitedBy: &callerID,
		User:      target,
	}
	if err := s.cohostRepo.Invite(ctx, record); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *cohostService) RespondInvitation(ctx context.Context, userID, groupID uuid.UUID, status domain.CohostStatus) error {
	if status != domain.CohostAccepted && status != domain.CohostDeclined {
		return fmt.Errorf("%w: status balasan harus 'accepted' atau 'declined'", ErrInvalidInput)
	}

	existing, err := s.cohostRepo.Find(ctx, groupID, userID)
	if err != nil || existing == nil {
		return fmt.Errorf("%w: undangan Co-Tutor tidak ditemukan", ErrInvalidInput)
	}

	return s.cohostRepo.UpdateStatus(ctx, groupID, userID, status)
}

func (s *cohostService) RemoveCohost(ctx context.Context, callerID, groupID, targetUserID uuid.UUID) error {
	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return err
	}

	if callerID != group.HostID && callerID != targetUserID {
		return fmt.Errorf("%w: Anda tidak memiliki izin untuk menghapus Co-Tutor ini", ErrUnauthorizedAction)
	}

	return s.cohostRepo.Remove(ctx, groupID, targetUserID)
}

func (s *cohostService) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.StudyGroupCohost, error) {
	return s.cohostRepo.ListByGroup(ctx, groupID)
}

func (s *cohostService) ListMyInvitations(ctx context.Context, userID uuid.UUID) ([]domain.StudyGroupCohost, error) {
	return s.cohostRepo.ListByUser(ctx, userID)
}