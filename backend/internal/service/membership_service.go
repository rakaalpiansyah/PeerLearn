package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

type MySessionsResponse struct {
	Hosted []domain.GroupResponse `json:"hosted"`
	Joined []domain.GroupResponse `json:"joined"`
}

type MembershipService interface {
	JoinGroup(ctx context.Context, userID, groupID uuid.UUID) (*domain.Membership, error)
	UpdateStatus(ctx context.Context, callerID, membershipID uuid.UUID, status domain.MembershipStatus) error
	GetGroupMembers(ctx context.Context, groupID, callerID uuid.UUID) ([]domain.Membership, error)
	GetMySessions(ctx context.Context, userID uuid.UUID) (*MySessionsResponse, error)
}

type membershipService struct {
	membershipRepo repository.MembershipRepository
	groupRepo      repository.GroupRepository
	feedbackRepo   repository.FeedbackRepository
	userRepo       repository.UserRepository
}

func NewMembershipService(
	membershipRepo repository.MembershipRepository,
	groupRepo repository.GroupRepository,
	feedbackRepo repository.FeedbackRepository,
	userRepo ...repository.UserRepository,
) MembershipService {
	var uRepo repository.UserRepository
	if len(userRepo) > 0 {
		uRepo = userRepo[0]
	}
	return &membershipService{
		membershipRepo: membershipRepo,
		groupRepo:      groupRepo,
		feedbackRepo:   feedbackRepo,
		userRepo:       uRepo,
	}
}

func (s *membershipService) JoinGroup(ctx context.Context, userID, groupID uuid.UUID) (*domain.Membership, error) {
	if s.userRepo != nil {
		user, err := s.userRepo.FindByID(ctx, userID)
		if err == nil && user != nil {
			if user.AccountStatus == domain.AccountRestricted {
				return nil, fmt.Errorf("%w: akun Anda sedang dibatasi sementara dan tidak dapat mengajukan permohonan bergabung", ErrInvalidInput)
			}
			if user.AccountStatus == domain.AccountSuspended {
				return nil, fmt.Errorf("%w: akun Anda telah ditangguhkan karena pelanggaran pedoman komunitas", ErrInvalidInput)
			}
		}
	}

	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("membershipService.JoinGroup: %w", err)
	}

	if group.HostID == userID {
		return nil, fmt.Errorf("%w: Anda adalah penyelenggara sesi ini", ErrInvalidInput)
	}

	if group.Status != domain.StatusOpen {
		return nil, fmt.Errorf("%w: sesi belajar tidak lagi menerima pendaftaran", ErrInvalidInput)
	}

	if group.CurrentMembers >= group.MaxCapacity {
		return nil, ErrGroupFull
	}

	existing, err := s.membershipRepo.Find(ctx, groupID, userID)
	if err == nil && existing != nil {
		return nil, repository.ErrAlreadyJoined
	}

	m := &domain.Membership{
		ID:      uuid.New(),
		GroupID: groupID,
		UserID:  userID,
		Status:  domain.MembershipPending,
	}

	if err := s.membershipRepo.Create(ctx, m); err != nil {
		return nil, fmt.Errorf("membershipService.JoinGroup create: %w", err)
	}

	return m, nil
}

func (s *membershipService) UpdateStatus(ctx context.Context, callerID, membershipID uuid.UUID, status domain.MembershipStatus) error {
	m, err := s.membershipRepo.FindByID(ctx, membershipID)
	if err != nil {
		return fmt.Errorf("membershipService.UpdateStatus: %w", err)
	}

	group, err := s.groupRepo.FindByID(ctx, m.GroupID)
	if err != nil {
		return fmt.Errorf("membershipService.UpdateStatus group: %w", err)
	}

	isHost := group.HostID == callerID
	isParticipant := m.UserID == callerID

	if !isHost && !(isParticipant && status == domain.MembershipCancelled) {
		return ErrUnauthorizedAction
	}

	if status == domain.MembershipAccepted {
		if group.CurrentMembers >= group.MaxCapacity {
			return ErrGroupFull
		}
		_ = s.feedbackRepo.AddContributionPoints(ctx, group.HostID, 2)
	}

	return s.membershipRepo.UpdateStatus(ctx, membershipID, status)
}

func (s *membershipService) GetGroupMembers(ctx context.Context, groupID, callerID uuid.UUID) ([]domain.Membership, error) {
	return s.membershipRepo.ListByGroup(ctx, groupID)
}

func (s *membershipService) GetMySessions(ctx context.Context, userID uuid.UUID) (*MySessionsResponse, error) {
	hosted, err := s.groupRepo.ListByHost(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("membershipService.GetMySessions ListByHost: %w", err)
	}
	if hosted == nil {
		hosted = []domain.GroupResponse{}
	}

	memberships, err := s.membershipRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("membershipService.GetMySessions ListByUser: %w", err)
	}

	joined := make([]domain.GroupResponse, 0, len(memberships))
	for _, m := range memberships {
		g, err := s.groupRepo.FindByID(ctx, m.GroupID)
		if err != nil {
			return nil, fmt.Errorf("membershipService.GetMySessions FindByID %s: %w", m.GroupID, err)
		}
		if g == nil {
			return nil, fmt.Errorf("membershipService.GetMySessions FindByID %s: repository returned nil group", m.GroupID)
		}
		g.UserMembership = &m.Status
		joined = append(joined, *g)
	}

	return &MySessionsResponse{
		Hosted: hosted,
		Joined: joined,
	}, nil
}
