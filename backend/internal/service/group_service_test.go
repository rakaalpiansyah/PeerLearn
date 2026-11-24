package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

type mockGroupRepository struct {
	groups map[uuid.UUID]*domain.LearningGroup
}

func newMockGroupRepository() *mockGroupRepository {
	return &mockGroupRepository{
		groups: make(map[uuid.UUID]*domain.LearningGroup),
	}
}

func (m *mockGroupRepository) Create(ctx context.Context, group *domain.LearningGroup) error {
	m.groups[group.ID] = group
	return nil
}

func (m *mockGroupRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupResponse, error) {
	g, ok := m.groups[id]
	if !ok {
		return nil, repository.ErrGroupNotFound
	}
	var hostResp *domain.UserResponse
	if g.Host != nil {
		u := domain.ToUserResponse(g.Host, nil)
		hostResp = &u
	}
	return &domain.GroupResponse{
		ID:              g.ID,
		HostID:          g.HostID,
		Title:           g.Title,
		Description:     g.Description,
		Category:        g.Category,
		Format:          g.Format,
		LocationOrLink:  g.LocationOrLink,
		Latitude:        g.Latitude,
		Longitude:       g.Longitude,
		BuildingDetails: g.BuildingDetails,
		Agenda:          g.Agenda,
		StartTime:       g.StartTime,
		EndTime:         g.EndTime,
		MaxCapacity:     g.MaxCapacity,
		Status:          g.Status,
		ReviewNote:      g.ReviewNote,
		ReviewedBy:      g.ReviewedBy,
		ReviewedAt:      g.ReviewedAt,
		Host:            hostResp,
	}, nil
}

func (m *mockGroupRepository) List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error) {
	var list []domain.GroupResponse
	for _, g := range m.groups {
		if !filter.IncludeUnapproved && (g.Status == domain.StatusPendingApproval || g.Status == domain.StatusRejected) {
			continue
		}
		if filter.Status != "" && g.Status != filter.Status {
			continue
		}
		var hostResp *domain.UserResponse
		if g.Host != nil {
			u := domain.ToUserResponse(g.Host, nil)
			hostResp = &u
		}
		list = append(list, domain.GroupResponse{
			ID:              g.ID,
			HostID:          g.HostID,
			Title:           g.Title,
			Description:     g.Description,
			Category:        g.Category,
			Format:          g.Format,
			LocationOrLink:  g.LocationOrLink,
			Latitude:        g.Latitude,
			Longitude:       g.Longitude,
			BuildingDetails: g.BuildingDetails,
			Agenda:          g.Agenda,
			StartTime:       g.StartTime,
			EndTime:         g.EndTime,
			MaxCapacity:     g.MaxCapacity,
			Status:          g.Status,
			ReviewNote:      g.ReviewNote,
			Host:            hostResp,
		})
	}
	return list, nil
}

func (m *mockGroupRepository) Update(ctx context.Context, group *domain.LearningGroup) error {
	m.groups[group.ID] = group
	return nil
}

func (m *mockGroupRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.GroupStatus) error {
	if g, ok := m.groups[id]; ok {
		g.Status = status
		return nil
	}
	return repository.ErrGroupNotFound
}

func (m *mockGroupRepository) ReviewGroup(ctx context.Context, id uuid.UUID, adminID uuid.UUID, status domain.GroupStatus, note string) error {
	g, ok := m.groups[id]
	if !ok {
		return repository.ErrGroupNotFound
	}
	now := time.Now().UTC()
	g.Status = status
	g.ReviewNote = note
	g.ReviewedBy = &adminID
	g.ReviewedAt = &now
	return nil
}

func (m *mockGroupRepository) ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error) {
	var list []domain.GroupResponse
	for _, g := range m.groups {
		if g.HostID == hostID {
			list = append(list, domain.GroupResponse{
				ID:        g.ID,
				HostID:    g.HostID,
				Title:     g.Title,
				Category:  g.Category,
				Status:    g.Status,
				StartTime: g.StartTime,
				EndTime:   g.EndTime,
			})
		}
	}
	return list, nil
}

func (m *mockGroupRepository) CancelByHost(ctx context.Context, hostID uuid.UUID) error {
	for _, g := range m.groups {
		if g.HostID == hostID && (g.Status == domain.StatusOpen || g.Status == domain.StatusOngoing) {
			g.Status = domain.StatusCancelled
		}
	}
	return nil
}

func (m *mockGroupRepository) FindRecommendations(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error) {
	var list []domain.GroupResponse
	for _, g := range m.groups {
		if g.HostID != userID && g.Status == domain.StatusOpen {
			list = append(list, domain.GroupResponse{
				ID:          g.ID,
				HostID:      g.HostID,
				Title:       g.Title,
				Category:    g.Category,
				MatchReason: "Struktur Data & Algoritma",
			})
		}
	}
	return list, nil
}

func TestGroupService_CreateAndAuthorize(t *testing.T) {
	repo := newMockGroupRepository()
	svc := service.NewGroupService(repo)
	ctx := context.Background()

	hostID := uuid.New()
	req := domain.CreateGroupRequest{
		Title:          "Belajar Algoritma Bersama",
		Description:    "Membahas pohon biner dan graph",
		Category:       "Teknologi",
		Format:         domain.FormatOnline,
		LocationOrLink: "https://meet.google.com/abc-defg-hij",
		StartTime:      time.Now().Add(24 * time.Hour),
		EndTime:        time.Now().Add(26 * time.Hour),
		MaxCapacity:    5,
	}

	// 1. Success Create
	created, err := svc.Create(ctx, hostID, req)
	if err != nil {
		t.Fatalf("Expected create group to succeed, got: %v", err)
	}
	if created.Title != req.Title {
		t.Errorf("Expected title %s, got %s", req.Title, created.Title)
	}
	if created.MaxCapacity != 5 {
		t.Errorf("Expected max capacity 5, got %d", created.MaxCapacity)
	}
	if created.Status != domain.StatusPendingApproval {
		t.Errorf("Expected newly created group status %s, got %s", domain.StatusPendingApproval, created.Status)
	}

	// Verify pending group is hidden from public catalog and visible to admin
	publicList, err := svc.List(ctx, domain.GroupFilter{}, nil)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(publicList) != 0 {
		t.Errorf("Expected 0 public sessions before admin approval, got %d", len(publicList))
	}
	adminList, err := svc.ListForAdmin(ctx, domain.GroupFilter{})
	if err != nil {
		t.Fatalf("ListForAdmin failed: %v", err)
	}
	if len(adminList) != 1 {
		t.Errorf("Expected 1 session in admin queue, got %d", len(adminList))
	}

	// 1b. Admin Approve & Reject workflow
	adminID := uuid.New()
	_, err = svc.ReviewGroup(ctx, adminID, created.ID, domain.ReviewGroupRequest{Action: "reject", Note: "   "})
	if err == nil {
		t.Errorf("Expected error when rejecting without a note")
	}
	rejected, err := svc.ReviewGroup(ctx, adminID, created.ID, domain.ReviewGroupRequest{
		Action: "reject",
		Note:   "Lengkapi agenda sesi terlebih dahulu",
	})
	if err != nil || rejected.Status != domain.StatusRejected {
		t.Fatalf("Expected rejected status, got %+v, err=%v", rejected, err)
	}
	approved, err := svc.ReviewGroup(ctx, adminID, created.ID, domain.ReviewGroupRequest{
		Action: "approve",
		Note:   "Layak tayang",
	})
	if err != nil || approved.Status != domain.StatusOpen {
		t.Fatalf("Expected open status after approve, got %+v, err=%v", approved, err)
	}
	publicListAfter, _ := svc.List(ctx, domain.GroupFilter{}, nil)
	if len(publicListAfter) != 1 {
		t.Errorf("Expected 1 public session after admin approval, got %d", len(publicListAfter))
	}

	// 2. Reject Empty Title
	badReq := req
	badReq.Title = ""
	_, err = svc.Create(ctx, hostID, badReq)
	if err == nil {
		t.Errorf("Expected error for empty title, got nil")
	}

	// 3. Reject Update by non-host
	strangerID := uuid.New()
	err = svc.Update(ctx, strangerID, created.ID, domain.UpdateGroupRequest{Title: "Hacked Title"})
	if err != service.ErrUnauthorizedAction {
		t.Errorf("Expected ErrUnauthorizedAction, got: %v", err)
	}
}

func TestGroupService_GetRecommendations(t *testing.T) {
	repo := newMockGroupRepository()
	svc := service.NewGroupService(repo)
	ctx := context.Background()

	hostID := uuid.New()
	learnerID := uuid.New()

	// Add an open group hosted by hostID
	group := &domain.LearningGroup{
		ID:          uuid.New(),
		HostID:      hostID,
		Title:       "Algoritma Pemrograman",
		Category:    "Teknologi",
		Status:      domain.StatusOpen,
		MaxCapacity: 5,
	}
	_ = repo.Create(ctx, group)

	// Learner requests recommendations
	recs, err := svc.GetRecommendations(ctx, learnerID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(recs) != 1 {
		t.Fatalf("Expected 1 recommendation, got %d", len(recs))
	}
	if recs[0].MatchReason != "Struktur Data & Algoritma" {
		t.Errorf("Expected match reason 'Struktur Data & Algoritma', got '%s'", recs[0].MatchReason)
	}

	// Host requesting recommendations shouldn't get their own group
	hostRecs, err := svc.GetRecommendations(ctx, hostID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(hostRecs) != 0 {
		t.Errorf("Expected 0 recommendations for host themselves, got %d", len(hostRecs))
	}

	// Nil user ID should be rejected
	_, err = svc.GetRecommendations(ctx, uuid.Nil)
	if err != service.ErrUnauthorizedAction {
		t.Errorf("Expected ErrUnauthorizedAction for nil user ID, got %v", err)
	}
}

func TestGroupService_ResolveMapLink(t *testing.T) {
	repo := newMockGroupRepository()
	svc := service.NewGroupService(repo)
	ctx := context.Background()

	t.Run("Direct coordinates with space", func(t *testing.T) {
		res, err := svc.ResolveMapLink(ctx, "-6.931754, 107.717145")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Latitude != -6.931754 || res.Longitude != 107.717145 {
			t.Errorf("expected lat -6.931754, lng 107.717145, got %f, %f", res.Latitude, res.Longitude)
		}
	})

	t.Run("Direct coordinates without space", func(t *testing.T) {
		res, err := svc.ResolveMapLink(ctx, "-6.938800,107.698000")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Latitude != -6.9388 || res.Longitude != 107.698 {
			t.Errorf("expected lat -6.9388, lng 107.698, got %f, %f", res.Latitude, res.Longitude)
		}
	})

	t.Run("Google Maps Place URL with coordinates and place name", func(t *testing.T) {
		url := "https://www.google.com/maps/place/Perpustakaan+Rachmat+Djatnika+UIN+SGD/@-6.932200,107.717500,17z/data=!3m1!4b1"
		res, err := svc.ResolveMapLink(ctx, url)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Latitude != -6.9322 || res.Longitude != 107.7175 {
			t.Errorf("expected lat -6.9322, lng 107.7175, got %f, %f", res.Latitude, res.Longitude)
		}
		if res.PlaceName != "Perpustakaan Rachmat Djatnika UIN SGD" {
			t.Errorf("expected place 'Perpustakaan Rachmat Djatnika UIN SGD', got '%s'", res.PlaceName)
		}
	})

	t.Run("Google Maps Query URL with q parameter", func(t *testing.T) {
		url := "https://maps.google.com/?q=-6.931754,107.717145"
		res, err := svc.ResolveMapLink(ctx, url)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Latitude != -6.931754 || res.Longitude != 107.717145 {
			t.Errorf("expected lat -6.931754, lng 107.717145, got %f, %f", res.Latitude, res.Longitude)
		}
	})

	t.Run("SSRF protection: rejects non-google domains", func(t *testing.T) {
		url := "https://evil-hacker.com/steal?q=-6.931754,107.717145"
		_, err := svc.ResolveMapLink(ctx, url)
		if err == nil {
			t.Fatal("expected error for non-google domain, got nil")
		}
	})

	t.Run("Rejects empty string", func(t *testing.T) {
		_, err := svc.ResolveMapLink(ctx, "   ")
		if err == nil {
			t.Fatal("expected error for empty string, got nil")
		}
	})
}

func TestGroupService_PrivacyMasking(t *testing.T) {
	ctx := context.Background()
	groupRepo := newMockGroupRepository()
	userRepo := newMockUserRepository()
	memRepo := newFullMockMembershipRepo()

	hostID := uuid.New()
	acceptedID := uuid.New()
	pendingID := uuid.New()
	adminID := uuid.New()
	lat := -6.931754
	lng := 107.717145

	hostUser := &domain.User{
		ID: hostID, Email: "host@student.uinsgd.ac.id", FullName: "Tutor FST", Role: domain.RoleStudent,
	}
	_ = userRepo.Create(ctx, hostUser)

	onlineID := uuid.New()
	offlineID := uuid.New()

	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID: onlineID, HostID: hostID, Title: "Kelas Online Rahasia", Format: domain.FormatOnline,
		LocationOrLink: "https://meet.google.com/secret-room", Status: domain.StatusOpen, Host: hostUser,
	})
	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID: offlineID, HostID: hostID, Title: "Kelas Offline Cibiru", Format: domain.FormatOffline,
		LocationOrLink: "Gedung FST Kampus 1 Cibiru", BuildingDetails: "Lab 302",
		Latitude: &lat, Longitude: &lng, Status: domain.StatusOpen, Host: hostUser,
	})

	_ = memRepo.Create(ctx, &domain.Membership{
		ID: uuid.New(), GroupID: onlineID, UserID: acceptedID, Status: domain.MembershipAccepted,
	})
	_ = memRepo.Create(ctx, &domain.Membership{
		ID: uuid.New(), GroupID: onlineID, UserID: pendingID, Status: domain.MembershipPending,
	})

	svc := service.NewGroupServiceWithDeps(groupRepo, userRepo, memRepo)

	// Guest cannot see online link, offline room/coords, or host email
	guestOnline, err := svc.GetByID(ctx, onlineID, nil)
	if err != nil {
		t.Fatalf("GetByID guest online failed: %v", err)
	}
	if guestOnline.LocationOrLink != "" {
		t.Errorf("expected online LocationOrLink hidden from guest, got %q", guestOnline.LocationOrLink)
	}
	if guestOnline.Host == nil || guestOnline.Host.Email != "" {
		t.Errorf("expected host email hidden from guest")
	}

	guestOffline, err := svc.GetByID(ctx, offlineID, nil)
	if err != nil {
		t.Fatalf("GetByID guest offline failed: %v", err)
	}
	if guestOffline.LocationOrLink == "" {
		t.Errorf("expected general campus location visible to guest")
	}
	if guestOffline.BuildingDetails != "" || guestOffline.Latitude != nil || guestOffline.Longitude != nil {
		t.Errorf("expected exact room details and GPS coordinates hidden from guest")
	}

	// Pending member still cannot see private meeting link
	pendingView, err := svc.GetByID(ctx, onlineID, &pendingID)
	if err != nil {
		t.Fatalf("GetByID pending member failed: %v", err)
	}
	if pendingView.LocationOrLink != "" {
		t.Errorf("expected online LocationOrLink hidden from pending applicant, got %q", pendingView.LocationOrLink)
	}

	// Accepted member can see meeting link, but not host personal email
	acceptedView, err := svc.GetByID(ctx, onlineID, &acceptedID)
	if err != nil {
		t.Fatalf("GetByID accepted member failed: %v", err)
	}
	if acceptedView.LocationOrLink != "https://meet.google.com/secret-room" {
		t.Errorf("expected accepted member to see meeting link, got %q", acceptedView.LocationOrLink)
	}
	if acceptedView.Host != nil && acceptedView.Host.Email != "" {
		t.Errorf("expected host email hidden from non-host member")
	}

	// Admin via context role can inspect everything
	adminCtx := domain.WithViewerRole(ctx, domain.RoleAdmin)
	adminView, err := svc.GetByID(adminCtx, offlineID, &adminID)
	if err != nil {
		t.Fatalf("GetByID admin failed: %v", err)
	}
	if adminView.BuildingDetails != "Lab 302" || adminView.Latitude == nil || adminView.Host.Email != "host@student.uinsgd.ac.id" {
		t.Errorf("expected admin to see full session details and host email")
	}
}

func TestGroupService_NotificationsOnReviewAndStatusUpdate(t *testing.T) {
	ctx := context.Background()
	groupRepo := newMockGroupRepository()
	userRepo := newMockUserRepository()
	memRepo := newFullMockMembershipRepo()
	notifRepo := newMockNotificationRepo()

	notifSvc := service.NewNotificationService(notifRepo)
	svc := service.NewGroupServiceWithDeps(groupRepo, userRepo, memRepo)
	svc.SetNotifier(notifSvc)

	hostID := uuid.New()
	memberID := uuid.New()
	pendingMemberID := uuid.New()
	adminID := uuid.New()

	created, err := svc.Create(ctx, hostID, domain.CreateGroupRequest{
		Title:          "Metodologi Penelitian Hukum",
		Description:    "Bimbingan penyusunan bab metodologi",
		Category:       "Hukum & Syariah",
		Format:         domain.FormatOnline,
		LocationOrLink: "https://meet.google.com/hukum-uin",
		StartTime:      time.Now().Add(24 * time.Hour),
		EndTime:        time.Now().Add(26 * time.Hour),
		MaxCapacity:    10,
	})
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if _, err := svc.ReviewGroup(ctx, adminID, created.ID, domain.ReviewGroupRequest{
		Action: "reject",
		Note:   "Perjelas agenda diskusi",
	}); err != nil {
		t.Fatalf("ReviewGroup reject failed: %v", err)
	}
	if _, err := svc.ReviewGroup(ctx, adminID, created.ID, domain.ReviewGroupRequest{
		Action: "approve",
		Note:   "Sudah sesuai",
	}); err != nil {
		t.Fatalf("ReviewGroup approve failed: %v", err)
	}

	hostNotifs, _ := notifSvc.ListForUser(ctx, hostID, 10)
	if len(hostNotifs.Notifications) != 2 {
		t.Fatalf("expected 2 review notifications for host, got %d", len(hostNotifs.Notifications))
	}
	if hostNotifs.Notifications[0].Type != domain.NotificationSessionApproved || hostNotifs.Notifications[1].Type != domain.NotificationSessionRejected {
		t.Errorf("unexpected host review notification types: %+v", hostNotifs.Notifications)
	}

	_ = memRepo.Create(ctx, &domain.Membership{
		ID: uuid.New(), GroupID: created.ID, UserID: memberID, Status: domain.MembershipAccepted,
	})
	_ = memRepo.Create(ctx, &domain.Membership{
		ID: uuid.New(), GroupID: created.ID, UserID: pendingMemberID, Status: domain.MembershipPending,
	})

	if err := svc.UpdateStatus(ctx, hostID, created.ID, domain.StatusCompleted); err != nil {
		t.Fatalf("UpdateStatus failed: %v", err)
	}

	memberNotifs, _ := notifSvc.ListForUser(ctx, memberID, 10)
	if len(memberNotifs.Notifications) != 1 || memberNotifs.Notifications[0].Type != domain.NotificationSessionStatus {
		t.Fatalf("expected 1 status notification for accepted member, got %+v", memberNotifs.Notifications)
	}
	pendingNotifs, _ := notifSvc.ListForUser(ctx, pendingMemberID, 10)
	if len(pendingNotifs.Notifications) != 0 {
		t.Errorf("expected pending applicant not to receive session status notification, got %d", len(pendingNotifs.Notifications))
	}
}
