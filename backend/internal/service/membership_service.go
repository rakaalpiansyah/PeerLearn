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
	SetNotifier(notifier NotificationDispatcher)
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
	notifier       NotificationDispatcher
}

func (s *membershipService) SetNotifier(notifier NotificationDispatcher) {
	s.notifier = notifier
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
	joinerName := "Seorang peserta"
	if s.userRepo != nil {
		user, err := s.userRepo.FindByID(ctx, userID)
		if err == nil && user != nil {
			if user.AccountStatus == domain.AccountRestricted {
				return nil, fmt.Errorf("%w: akun Anda sedang dibatasi sementara dan tidak dapat mengajukan permohonan bergabung", ErrInvalidInput)
			}
			if user.AccountStatus == domain.AccountSuspended {
				return nil, fmt.Errorf("%w: akun Anda telah ditangguhkan karena pelanggaran pedoman komunitas", ErrInvalidInput)
			}
			if user.FullName != "" {
				joinerName = user.FullName
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
		if existing.Status == domain.MembershipCancelled {
			if err := s.membershipRepo.UpdateStatus(ctx, existing.ID, domain.MembershipPending); err != nil {
				return nil, fmt.Errorf("membershipService.JoinGroup rejoin: %w", err)
			}
			existing.Status = domain.MembershipPending
			if s.notifier != nil {
				gid := group.ID
				_ = s.notifier.Notify(ctx, group.HostID, domain.NotificationJoinRequest, "Permintaan Bergabung Ulang", fmt.Sprintf("%s mengajukan ulang permohonan bergabung ke sesi %q.", joinerName, group.Title), &gid)
			}
			return existing, nil
		}
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

	if s.notifier != nil {
		gid := group.ID
		_ = s.notifier.Notify(ctx, group.HostID, domain.NotificationJoinRequest, "Permintaan Bergabung Baru", fmt.Sprintf("%s meminta bergabung ke sesi %q.", joinerName, group.Title), &gid)
	}

	return m, nil
}

func (s *membershipService) UpdateStatus(ctx context.Context, callerID, membershipID uuid.UUID, status domain.MembershipStatus) error {
	switch status {
	case domain.MembershipPending, domain.MembershipAccepted, domain.MembershipRejected, domain.MembershipCancelled, domain.MembershipAttended:
	default:
		return fmt.Errorf("%w: status keanggotaan tidak valid", ErrInvalidInput)
	}

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
		if m.Status == domain.MembershipAccepted || m.Status == domain.MembershipAttended {
			return nil
		}
		acceptedCount, countErr := s.membershipRepo.CountAccepted(ctx, m.GroupID)
		if countErr != nil {
			acceptedCount = group.CurrentMembers
		}
		if acceptedCount >= group.MaxCapacity {
			return ErrGroupFull
		}
	}

	if status == domain.MembershipAttended {
		if m.Status == domain.MembershipAttended {
			return nil
		}
		if m.Status != domain.MembershipAccepted {
			return fmt.Errorf("%w: hanya peserta yang telah diterima yang dapat ditandai hadir", ErrInvalidInput)
		}
	}

	if err := s.membershipRepo.UpdateStatus(ctx, membershipID, status); err != nil {
		return err
	}

	if status == domain.MembershipAccepted && s.feedbackRepo != nil {
		_ = s.feedbackRepo.AddContributionPoints(ctx, group.HostID, 2)
	}
	if status == domain.MembershipAttended && s.feedbackRepo != nil {
		_ = s.feedbackRepo.AddContributionPoints(ctx, group.HostID, 3)
		_ = s.feedbackRepo.AddContributionPoints(ctx, m.UserID, 1)
	}

	if s.notifier != nil {
		gid := group.ID
		switch status {
		case domain.MembershipAccepted:
			_ = s.notifier.Notify(ctx, m.UserID, domain.NotificationMembershipAccepted, "Permintaan Bergabung Disetujui", fmt.Sprintf("Permintaan Anda untuk bergabung ke sesi %q telah disetujui tutor.", group.Title), &gid)
		case domain.MembershipRejected:
			_ = s.notifier.Notify(ctx, m.UserID, domain.NotificationMembershipRejected, "Permintaan Bergabung Ditolak", fmt.Sprintf("Permintaan bergabung pada sesi %q belum dapat disetujui.", group.Title), &gid)
		case domain.MembershipAttended:
			_ = s.notifier.Notify(ctx, m.UserID, domain.NotificationAttendanceMarked, "Kehadiran Sesi Tercatat (SKPI)", fmt.Sprintf("Tutor telah memverifikasi kehadiran Anda pada sesi %q (+1 poin SKPI).", group.Title), &gid)
		}
	}

	return nil
}

func (s *membershipService) GetGroupMembers(ctx context.Context, groupID, callerID uuid.UUID) ([]domain.Membership, error) {
	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("membershipService.GetGroupMembers group: %w", err)
	}

	viewerRole, _ := domain.ViewerRoleFromContext(ctx)
	if viewerRole == "" && callerID != uuid.Nil && s.userRepo != nil {
		if u, uErr := s.userRepo.FindByID(ctx, callerID); uErr == nil && u != nil {
			viewerRole = u.Role
		}
	}
	isPrivileged := viewerRole == domain.RoleAdmin || (callerID != uuid.Nil && group.HostID == callerID)

	members, err := s.membershipRepo.ListByGroup(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("membershipService.GetGroupMembers list: %w", err)
	}

	if isPrivileged {
		return members, nil
	}

	filtered := make([]domain.Membership, 0, len(members))
	for _, m := range members {
		if m.Status != domain.MembershipAccepted && m.Status != domain.MembershipAttended && !(callerID != uuid.Nil && m.UserID == callerID) {
			continue
		}
		if m.User != nil && !(callerID != uuid.Nil && m.UserID == callerID) {
			userCopy := *m.User
			userCopy.Email = ""
			m.User = &userCopy
		}
		filtered = append(filtered, m)
	}

	return filtered, nil
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
		uid := userID
		domain.SanitizeGroupForViewer(g, &uid, "")
		joined = append(joined, *g)
	}

	return &MySessionsResponse{
		Hosted: hosted,
		Joined: joined,
	}, nil
}
