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
	SetCoHostRepo(repo repository.GroupCoHostRepository)
	SetWaitlistRepo(repo repository.WaitlistRepository)
	JoinGroup(ctx context.Context, userID, groupID uuid.UUID) (*domain.Membership, error)
	UpdateStatus(ctx context.Context, callerID, membershipID uuid.UUID, status domain.MembershipStatus) error
	GetGroupMembers(ctx context.Context, groupID, callerID uuid.UUID) ([]domain.Membership, error)
	GetMySessions(ctx context.Context, userID uuid.UUID) (*MySessionsResponse, error)
}

type membershipService struct {
	membershipRepo repository.MembershipRepository
	waitlistRepo   repository.WaitlistRepository
	groupRepo      repository.GroupRepository
	feedbackRepo   repository.FeedbackRepository
	userRepo       repository.UserRepository
	coHostRepo     repository.GroupCoHostRepository
	notifier       NotificationDispatcher
}

func (s *membershipService) SetNotifier(notifier NotificationDispatcher) {
	s.notifier = notifier
}

func (s *membershipService) SetCoHostRepo(repo repository.GroupCoHostRepository) {
	s.coHostRepo = repo
}

func (s *membershipService) SetWaitlistRepo(repo repository.WaitlistRepository) {
	s.waitlistRepo = repo
}

func (s *membershipService) isGroupManager(ctx context.Context, group *domain.GroupResponse, callerID uuid.UUID) bool {
	if group == nil || callerID == uuid.Nil {
		return false
	}
	if group.HostID == callerID {
		return true
	}
	if s.coHostRepo != nil {
		isCo, err := s.coHostRepo.IsCoHost(ctx, group.ID, callerID)
		if err == nil && isCo {
			return true
		}
	}
	return false
}

func (s *membershipService) notifyManagers(ctx context.Context, group *domain.GroupResponse, nType domain.NotificationType, title, msg string) {
	if s.notifier == nil || group == nil {
		return
	}
	gid := group.ID
	notified := map[uuid.UUID]bool{group.HostID: true}
	_ = s.notifier.Notify(ctx, group.HostID, nType, title, msg, &gid)
	if s.coHostRepo != nil {
		if coHosts, err := s.coHostRepo.ListByGroup(ctx, group.ID); err == nil {
			for _, ch := range coHosts {
				if notified[ch.UserID] {
					continue
				}
				notified[ch.UserID] = true
				_ = s.notifier.Notify(ctx, ch.UserID, nType, title, msg, &gid)
			}
		}
	}
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
	var waitlistRepo repository.WaitlistRepository
	if w, ok := membershipRepo.(repository.WaitlistRepository); ok {
		waitlistRepo = w
	}
	return &membershipService{
		membershipRepo: membershipRepo,
		waitlistRepo:   waitlistRepo,
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
	if s.coHostRepo != nil {
		if isCo, _ := s.coHostRepo.IsCoHost(ctx, groupID, userID); isCo {
			return nil, fmt.Errorf("%w: Anda sudah tercatat sebagai Co-Author sesi ini", ErrInvalidInput)
		}
	}

	if group.Status != domain.StatusOpen {
		return nil, fmt.Errorf("%w: sesi belajar tidak lagi menerima pendaftaran", ErrInvalidInput)
	}

	acceptedCount, countErr := s.membershipRepo.CountAccepted(ctx, groupID)
	if countErr != nil {
		acceptedCount = group.CurrentMembers
	}
	isFull := group.MaxCapacity > 0 && acceptedCount >= group.MaxCapacity
	targetStatus := domain.MembershipPending
	if isFull {
		targetStatus = domain.MembershipWaitlisted
	}

	existing, err := s.membershipRepo.Find(ctx, groupID, userID)
	if err == nil && existing != nil {
		if existing.Status == domain.MembershipCancelled {
			if err := s.membershipRepo.UpdateStatus(ctx, existing.ID, targetStatus); err != nil {
				return nil, fmt.Errorf("membershipService.JoinGroup rejoin: %w", err)
			}
			existing.Status = targetStatus
			if targetStatus == domain.MembershipWaitlisted {
				if s.notifier != nil {
					gid := group.ID
					_ = s.notifier.Notify(ctx, userID, domain.NotificationWaitlistJoined, "Masuk Daftar Tunggu", fmt.Sprintf("Kuota sesi %q sedang penuh. Anda masuk daftar tunggu dan akan diproses otomatis bila ada kursi kosong.", group.Title), &gid)
				}
			} else {
				s.notifyManagers(ctx, group, domain.NotificationJoinRequest, "Permintaan Bergabung Ulang", fmt.Sprintf("%s mengajukan ulang permohonan bergabung ke sesi %q.", joinerName, group.Title))
			}
			return existing, nil
		}
		return nil, repository.ErrAlreadyJoined
	}

	m := &domain.Membership{
		ID:      uuid.New(),
		GroupID: groupID,
		UserID:  userID,
		Status:  targetStatus,
	}

	if err := s.membershipRepo.Create(ctx, m); err != nil {
		return nil, fmt.Errorf("membershipService.JoinGroup create: %w", err)
	}

	if targetStatus == domain.MembershipWaitlisted {
		if s.notifier != nil {
			gid := group.ID
			_ = s.notifier.Notify(ctx, userID, domain.NotificationWaitlistJoined, "Masuk Daftar Tunggu", fmt.Sprintf("Kuota sesi %q sedang penuh. Anda masuk daftar tunggu dan akan diproses otomatis bila ada kursi kosong.", group.Title), &gid)
		}
	} else {
		s.notifyManagers(ctx, group, domain.NotificationJoinRequest, "Permintaan Bergabung Baru", fmt.Sprintf("%s meminta bergabung ke sesi %q.", joinerName, group.Title))
	}

	return m, nil
}

func (s *membershipService) UpdateStatus(ctx context.Context, callerID, membershipID uuid.UUID, status domain.MembershipStatus) error {
	switch status {
	case domain.MembershipPending, domain.MembershipAccepted, domain.MembershipRejected, domain.MembershipCancelled, domain.MembershipAttended, domain.MembershipWaitlisted:
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

	isManager := s.isGroupManager(ctx, group, callerID)
	isParticipant := m.UserID == callerID

	if !isManager && !(isParticipant && status == domain.MembershipCancelled) {
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

	wasOccupyingSeat := m.Status == domain.MembershipAccepted || m.Status == domain.MembershipAttended

	if err := s.membershipRepo.UpdateStatus(ctx, membershipID, status); err != nil {
		return err
	}

	if wasOccupyingSeat && (status == domain.MembershipCancelled || status == domain.MembershipRejected) && s.waitlistRepo != nil && group.Status == domain.StatusOpen {
		acceptedCount, countErr := s.membershipRepo.CountAccepted(ctx, m.GroupID)
		if countErr == nil && acceptedCount < group.MaxCapacity {
			if next, wErr := s.waitlistRepo.FindOldestWaitlisted(ctx, m.GroupID); wErr == nil && next != nil {
				if pErr := s.membershipRepo.UpdateStatus(ctx, next.ID, domain.MembershipPending); pErr == nil {
					if s.notifier != nil {
						gid := group.ID
						_ = s.notifier.Notify(ctx, next.UserID, domain.NotificationWaitlistPromoted, "Slot Sesi Tersedia", fmt.Sprintf("Ada kursi kosong pada sesi %q. Permohonan Anda otomatis dipromosikan dari daftar tunggu ke antrean persetujuan tutor.", group.Title), &gid)
					}
					nextName := "Peserta daftar tunggu"
					if s.userRepo != nil {
						if nu, uErr := s.userRepo.FindByID(ctx, next.UserID); uErr == nil && nu != nil && nu.FullName != "" {
							nextName = nu.FullName
						}
					}
					s.notifyManagers(ctx, group, domain.NotificationJoinRequest, "Antrean Daftar Tunggu Naik", fmt.Sprintf("%s naik otomatis dari daftar tunggu karena ada kursi kosong pada sesi %q.", nextName, group.Title))
				}
			}
		}
	}

	if status == domain.MembershipAccepted && s.feedbackRepo != nil {
		_ = s.feedbackRepo.AddContributionPoints(ctx, group.HostID, 2)
	}
	if status == domain.MembershipAttended && s.feedbackRepo != nil {
		_ = s.feedbackRepo.AddContributionPoints(ctx, group.HostID, 3)
		_ = s.feedbackRepo.AddContributionPoints(ctx, m.UserID, 1)
		if s.coHostRepo != nil {
			if coHosts, chErr := s.coHostRepo.ListByGroup(ctx, group.ID); chErr == nil {
				awarded := map[uuid.UUID]bool{group.HostID: true}
				for _, ch := range coHosts {
					if awarded[ch.UserID] {
						continue
					}
					awarded[ch.UserID] = true
					_ = s.feedbackRepo.AddContributionPoints(ctx, ch.UserID, 2)
				}
			}
		}
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
	isPrivileged := viewerRole == domain.RoleAdmin || s.isGroupManager(ctx, group, callerID)

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
	seenHosted := make(map[uuid.UUID]bool, len(hosted))
	for i := range hosted {
		hosted[i].ViewerRole = "host"
		seenHosted[hosted[i].ID] = true
	}

	if s.coHostRepo != nil {
		if coHostedIDs, chErr := s.coHostRepo.ListGroupIDsByUser(ctx, userID); chErr == nil {
			for _, gid := range coHostedIDs {
				if seenHosted[gid] {
					continue
				}
				if g, gErr := s.groupRepo.FindByID(ctx, gid); gErr == nil && g != nil {
					g.CoHosts, _ = s.coHostRepo.ListByGroup(ctx, gid)
					g.ViewerRole = "cohost"
					seenHosted[gid] = true
					hosted = append(hosted, *g)
				}
			}
		}
	}

	if s.coHostRepo != nil && len(hosted) > 0 {
		ids := make([]uuid.UUID, 0, len(hosted))
		for _, h := range hosted {
			ids = append(ids, h.ID)
		}
		if byGroup, bErr := s.coHostRepo.ListByGroupIDs(ctx, ids); bErr == nil {
			for i := range hosted {
				if len(hosted[i].CoHosts) == 0 {
					hosted[i].CoHosts = byGroup[hosted[i].ID]
				}
			}
		}
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
