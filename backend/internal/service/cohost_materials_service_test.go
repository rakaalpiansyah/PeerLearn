package service_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

type mockCoHostRepo struct {
	entries map[uuid.UUID][]domain.GroupCoHost
	users   *mockUserRepository
}

func newMockCoHostRepo(users *mockUserRepository) *mockCoHostRepo {
	return &mockCoHostRepo{
		entries: make(map[uuid.UUID][]domain.GroupCoHost),
		users:   users,
	}
}

func (m *mockCoHostRepo) Add(ctx context.Context, groupID, userID, addedBy uuid.UUID) error {
	for _, ch := range m.entries[groupID] {
		if ch.UserID == userID {
			return nil
		}
	}
	var uResp *domain.UserResponse
	if m.users != nil {
		if u, err := m.users.FindByID(ctx, userID); err == nil && u != nil {
			cp := domain.ToUserResponse(u, nil)
			uResp = &cp
		}
	}
	ab := addedBy
	m.entries[groupID] = append(m.entries[groupID], domain.GroupCoHost{
		GroupID:   groupID,
		UserID:    userID,
		AddedBy:   &ab,
		CreatedAt: time.Now().UTC(),
		User:      uResp,
	})
	return nil
}

func (m *mockCoHostRepo) Remove(ctx context.Context, groupID, userID uuid.UUID) error {
	curr := m.entries[groupID]
	next := make([]domain.GroupCoHost, 0, len(curr))
	for _, ch := range curr {
		if ch.UserID != userID {
			next = append(next, ch)
		}
	}
	m.entries[groupID] = next
	return nil
}

func (m *mockCoHostRepo) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.GroupCoHost, error) {
	list := m.entries[groupID]
	if list == nil {
		return []domain.GroupCoHost{}, nil
	}
	out := make([]domain.GroupCoHost, len(list))
	copy(out, list)
	return out, nil
}

func (m *mockCoHostRepo) ListByGroupIDs(ctx context.Context, groupIDs []uuid.UUID) (map[uuid.UUID][]domain.GroupCoHost, error) {
	res := make(map[uuid.UUID][]domain.GroupCoHost)
	for _, gid := range groupIDs {
		if list := m.entries[gid]; len(list) > 0 {
			cp := make([]domain.GroupCoHost, len(list))
			copy(cp, list)
			res[gid] = cp
		}
	}
	return res, nil
}

func (m *mockCoHostRepo) ListGroupIDsByUser(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	for gid, list := range m.entries {
		for _, ch := range list {
			if ch.UserID == userID {
				ids = append(ids, gid)
				break
			}
		}
	}
	return ids, nil
}

func (m *mockCoHostRepo) IsCoHost(ctx context.Context, groupID, userID uuid.UUID) (bool, error) {
	for _, ch := range m.entries[groupID] {
		if ch.UserID == userID {
			return true, nil
		}
	}
	return false, nil
}

type mockMaterialRepo struct {
	items map[uuid.UUID]domain.GroupMaterial
}

func newMockMaterialRepo() *mockMaterialRepo {
	return &mockMaterialRepo{items: make(map[uuid.UUID]domain.GroupMaterial)}
}

func (m *mockMaterialRepo) Create(ctx context.Context, mat *domain.GroupMaterial) error {
	if mat.ID == uuid.Nil {
		mat.ID = uuid.New()
	}
	mat.CreatedAt = time.Now().UTC()
	m.items[mat.ID] = *mat
	return nil
}

func (m *mockMaterialRepo) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.GroupMaterial, error) {
	out := make([]domain.GroupMaterial, 0)
	for _, it := range m.items {
		if it.GroupID == groupID {
			out = append(out, it)
		}
	}
	return out, nil
}

func (m *mockMaterialRepo) FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupMaterial, error) {
	it, ok := m.items[id]
	if !ok {
		return nil, repository.ErrMaterialNotFound
	}
	cp := it
	return &cp, nil
}

func (m *mockMaterialRepo) Delete(ctx context.Context, id uuid.UUID) error {
	if _, ok := m.items[id]; !ok {
		return repository.ErrMaterialNotFound
	}
	delete(m.items, id)
	return nil
}

type mockNotifierRecorder struct {
	events []domain.Notification
}

func (m *mockNotifierRecorder) Notify(ctx context.Context, userID uuid.UUID, nType domain.NotificationType, title, message string, relatedGroupID *uuid.UUID) error {
	m.events = append(m.events, domain.Notification{
		ID:             uuid.New(),
		UserID:         userID,
		Type:           nType,
		Title:          title,
		Message:        message,
		RelatedGroupID: relatedGroupID,
	})
	return nil
}

type mockMembershipRepoForPhase4 struct {
	list  []domain.Membership
	users *mockUserRepository
}

func newMockMembershipRepoForPhase4(users *mockUserRepository) *mockMembershipRepoForPhase4 {
	return &mockMembershipRepoForPhase4{users: users}
}

func (m *mockMembershipRepoForPhase4) Create(ctx context.Context, mem *domain.Membership) error {
	if mem.ID == uuid.Nil {
		mem.ID = uuid.New()
	}
	now := time.Now().UTC()
	mem.CreatedAt = now
	mem.UpdatedAt = now
	if m.users != nil {
		if u, err := m.users.FindByID(ctx, mem.UserID); err == nil && u != nil {
			cp := *u
			mem.User = &cp
		}
	}
	m.list = append(m.list, *mem)
	return nil
}

func (m *mockMembershipRepoForPhase4) Find(ctx context.Context, groupID, userID uuid.UUID) (*domain.Membership, error) {
	for i := range m.list {
		if m.list[i].GroupID == groupID && m.list[i].UserID == userID {
			cp := m.list[i]
			return &cp, nil
		}
	}
	return nil, repository.ErrMembershipNotFound
}

func (m *mockMembershipRepoForPhase4) FindByID(ctx context.Context, id uuid.UUID) (*domain.Membership, error) {
	for i := range m.list {
		if m.list[i].ID == id {
			cp := m.list[i]
			return &cp, nil
		}
	}
	return nil, repository.ErrMembershipNotFound
}

func (m *mockMembershipRepoForPhase4) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.Membership, error) {
	var out []domain.Membership
	for _, mem := range m.list {
		if mem.GroupID == groupID {
			out = append(out, mem)
		}
	}
	return out, nil
}

func (m *mockMembershipRepoForPhase4) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Membership, error) {
	var out []domain.Membership
	for _, mem := range m.list {
		if mem.UserID == userID {
			out = append(out, mem)
		}
	}
	return out, nil
}

func (m *mockMembershipRepoForPhase4) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.MembershipStatus) error {
	for i := range m.list {
		if m.list[i].ID == id {
			m.list[i].Status = status
			m.list[i].UpdatedAt = time.Now().UTC()
			return nil
		}
	}
	return repository.ErrMembershipNotFound
}

func (m *mockMembershipRepoForPhase4) CountAccepted(ctx context.Context, groupID uuid.UUID) (int, error) {
	count := 0
	for _, mem := range m.list {
		if mem.GroupID == groupID && (mem.Status == domain.MembershipAccepted || mem.Status == domain.MembershipAttended) {
			count++
		}
	}
	return count, nil
}

type mockFeedbackRepoForPhase4 struct {
	users *mockUserRepository
}

func (m *mockFeedbackRepoForPhase4) Create(ctx context.Context, f *domain.Feedback) error { return nil }
func (m *mockFeedbackRepoForPhase4) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.Feedback, error) {
	return nil, nil
}
func (m *mockFeedbackRepoForPhase4) ListByReviewer(ctx context.Context, reviewerID uuid.UUID) ([]domain.Feedback, error) {
	return nil, nil
}
func (m *mockFeedbackRepoForPhase4) AddContributionPoints(ctx context.Context, userID uuid.UUID, points int) error {
	if m.users != nil {
		if u, err := m.users.FindByID(ctx, userID); err == nil && u != nil {
			u.ContributionPoints += points
		}
	}
	return nil
}

func TestCoHostPermissions_And_SKPI_And_Recommendations(t *testing.T) {
	ctx := context.Background()
	userRepo := newMockUserRepository()
	groupRepo := newMockGroupRepository()
	memberRepo := newMockMembershipRepoForPhase4(userRepo)
	coHostRepo := newMockCoHostRepo(userRepo)
	notifier := &mockNotifierRecorder{}
	feedbackRepo := &mockFeedbackRepoForPhase4{users: userRepo}

	hostID := uuid.New()
	coHostID := uuid.New()
	studentID := uuid.New()
	outsiderID := uuid.New()

	for _, u := range []*domain.User{
		{ID: hostID, Email: "host@uinsgd.ac.id", FullName: "Nabila Azzahra", Role: domain.RoleStudent, CampusName: "UIN SGD Bandung - S1 Teknik Informatika", AccountStatus: domain.AccountActive},
		{ID: coHostID, Email: "cohost@uinsgd.ac.id", FullName: "Fajar Ramadhan", Role: domain.RoleStudent, CampusName: "UIN SGD Bandung - S1 Teknik Informatika", AccountStatus: domain.AccountActive},
		{ID: studentID, Email: "peserta@uinsgd.ac.id", FullName: "Aulia Rahma", Role: domain.RoleStudent, CampusName: "UIN SGD Bandung - S1 Teknik Informatika", AccountStatus: domain.AccountActive},
		{ID: outsiderID, Email: "luar@uinsgd.ac.id", FullName: "Bima Pratama", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
	} {
		_ = userRepo.Create(ctx, u)
	}

	groupID := uuid.New()
	start := time.Now().UTC().Add(48 * time.Hour)
	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID:             groupID,
		HostID:         hostID,
		Title:          "Praktikum Basis Data Lanjut",
		Category:       "Teknologi",
		Format:         domain.FormatOnline,
		LocationOrLink: "https://meet.google.com/secret-cohost-room",
		StartTime:      start,
		EndTime:        start.Add(2 * time.Hour),
		MaxCapacity:    10,
		Status:         domain.StatusOpen,
	})

	groupSvc := service.NewGroupServiceWithDeps(groupRepo, userRepo, memberRepo)
	groupSvc.SetCoHostRepo(coHostRepo)
	groupSvc.SetNotifier(notifier)

	memberSvc := service.NewMembershipService(memberRepo, groupRepo, feedbackRepo, userRepo)
	memberSvc.SetCoHostRepo(coHostRepo)
	memberSvc.SetNotifier(notifier)

	msgRepo := newMockMessageRepository()
	msgSvc := service.NewMessageService(msgRepo, groupRepo, memberRepo)
	msgSvc.SetCoHostRepo(coHostRepo)

	userSvc := service.NewUserService(userRepo, &mockSkillRepository{}, groupRepo, memberRepo)
	userSvc.SetCoHostRepo(coHostRepo)

	// Non-host cannot add co-host
	if _, err := groupSvc.AddCoHost(ctx, outsiderID, groupID, coHostID); !errors.Is(err, service.ErrUnauthorizedAction) {
		t.Fatalf("expected ErrUnauthorizedAction when non-host adds co-host, got %v", err)
	}

	// Host adds Co-Author
	coHosts, err := groupSvc.AddCoHost(ctx, hostID, groupID, coHostID)
	if err != nil {
		t.Fatalf("AddCoHost failed: %v", err)
	}
	if len(coHosts) != 1 || coHosts[0].UserID != coHostID {
		t.Fatalf("expected 1 cohost (%s), got %+v", coHostID, coHosts)
	}
	if coHosts[0].User != nil && coHosts[0].User.Email != "" {
		t.Fatalf("expected co-host email masked in sanitized list, got %q", coHosts[0].User.Email)
	}

	// Outsider viewing group sees masked online link and masked host/cohost emails
	guestView, err := groupSvc.GetByID(ctx, groupID, &outsiderID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}
	if guestView.LocationOrLink != "" {
		t.Fatalf("expected hidden meeting link for outsider, got %q", guestView.LocationOrLink)
	}
	if len(guestView.CoHosts) != 1 || guestView.CoHosts[0].User.Email != "" {
		t.Fatalf("expected masked cohost email for outsider, got %+v", guestView.CoHosts)
	}

	// Co-Author sees private link & cannot cancel group
	coView, err := groupSvc.GetByID(ctx, groupID, &coHostID)
	if err != nil {
		t.Fatalf("GetByID for cohost failed: %v", err)
	}
	if coView.LocationOrLink == "" {
		t.Fatal("expected Co-Author to see private meeting link")
	}
	if err := groupSvc.UpdateStatus(ctx, coHostID, groupID, domain.StatusCancelled); !errors.Is(err, service.ErrUnauthorizedAction) {
		t.Fatalf("expected ErrUnauthorizedAction when Co-Author tries cancelling, got %v", err)
	}

	// Co-Author cannot add or remove other Co-Authors
	if _, err := groupSvc.AddCoHost(ctx, coHostID, groupID, outsiderID); !errors.Is(err, service.ErrUnauthorizedAction) {
		t.Fatalf("expected Co-Author AddCoHost rejected, got %v", err)
	}

	// Student requests join; Co-Author approves & marks attended
	mem, err := memberSvc.JoinGroup(ctx, studentID, groupID)
	if err != nil {
		t.Fatalf("JoinGroup failed: %v", err)
	}
	if err := memberSvc.UpdateStatus(ctx, coHostID, mem.ID, domain.MembershipAccepted); err != nil {
		t.Fatalf("Co-Author approve failed: %v", err)
	}
	if err := memberSvc.UpdateStatus(ctx, coHostID, mem.ID, domain.MembershipAttended); err != nil {
		t.Fatalf("Co-Author mark attended failed: %v", err)
	}

	// Verify points awarded to host (+3 + +2 from accept) and cohost (+2 from attend)
	hostAfter, _ := userRepo.FindByID(ctx, hostID)
	coHostAfter, _ := userRepo.FindByID(ctx, coHostID)
	if hostAfter.ContributionPoints < 5 {
		t.Fatalf("expected host points >= 5, got %d", hostAfter.ContributionPoints)
	}
	if coHostAfter.ContributionPoints != 2 {
		t.Fatalf("expected cohost points = 2 after attended check-in, got %d", coHostAfter.ContributionPoints)
	}

	// Both Co-Author and Attended student can access & pin messages
	sentMsg, err := msgSvc.SendMessage(ctx, studentID, groupID, "Materi slide di mana kak?", nil)
	if err != nil {
		t.Fatalf("expected attended student to retain chat access, got %v", err)
	}
	pinned, err := msgSvc.TogglePinMessage(ctx, coHostID, groupID, sentMsg.ID)
	if err != nil || !pinned.IsPinned {
		t.Fatalf("expected Co-Author to pin message, got err=%v pinned=%+v", err, pinned)
	}

	// Co-Author can complete session and appears in MySessions & SKPI Verification
	if err := groupSvc.UpdateStatus(ctx, coHostID, groupID, domain.StatusCompleted); err != nil {
		t.Fatalf("Co-Author mark completed failed: %v", err)
	}
	mySess, err := memberSvc.GetMySessions(ctx, coHostID)
	if err != nil {
		t.Fatalf("GetMySessions failed: %v", err)
	}
	if len(mySess.Hosted) != 1 || mySess.Hosted[0].ViewerRole != "cohost" {
		t.Fatalf("expected co-hosted session in Hosted with viewer_role=cohost, got %+v", mySess.Hosted)
	}

	skpi, err := userSvc.GetSKPIVerification(ctx, coHostID)
	if err != nil {
		t.Fatalf("GetSKPIVerification failed: %v", err)
	}
	if skpi.VerifiedHostedCount != 1 || len(skpi.CompletedSessions) != 1 || skpi.CompletedSessions[0].Role != "co_tutor" {
		t.Fatalf("expected co_tutor in SKPI completed_sessions, got %+v", skpi)
	}

	// Recommendations exclude co-hosted group
	otherGroupID := uuid.New()
	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID:          otherGroupID,
		HostID:      outsiderID,
		Title:       "Algoritma Pemrograman Lanjut",
		Category:    "Teknologi",
		Format:      domain.FormatOnline,
		StartTime:   start.Add(24 * time.Hour),
		EndTime:     start.Add(26 * time.Hour),
		MaxCapacity: 8,
		Status:      domain.StatusOpen,
	})
	_ = groupRepo.UpdateStatus(ctx, groupID, domain.StatusOpen)
	recs, err := groupSvc.GetRecommendations(ctx, coHostID)
	if err != nil {
		t.Fatalf("GetRecommendations failed: %v", err)
	}
	for _, r := range recs {
		if r.ID == groupID {
			t.Fatal("expected co-hosted group to be excluded from user recommendations")
		}
	}

	// Host removes Co-Author
	afterRemove, err := groupSvc.RemoveCoHost(ctx, hostID, groupID, coHostID)
	if err != nil {
		t.Fatalf("RemoveCoHost failed: %v", err)
	}
	if len(afterRemove) != 0 {
		t.Fatalf("expected 0 cohosts after removal, got %d", len(afterRemove))
	}
}

func TestSessionMaterials_SecurityAndLifecycle(t *testing.T) {
	ctx := context.Background()
	userRepo := newMockUserRepository()
	groupRepo := newMockGroupRepository()
	memberRepo := newMockMembershipRepoForPhase4(userRepo)
	coHostRepo := newMockCoHostRepo(userRepo)
	matRepo := newMockMaterialRepo()

	hostID := uuid.New()
	coHostID := uuid.New()
	acceptedID := uuid.New()
	outsiderID := uuid.New()

	for _, u := range []*domain.User{
		{ID: hostID, Email: "host@uinsgd.ac.id", FullName: "Nabila", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
		{ID: coHostID, Email: "co@uinsgd.ac.id", FullName: "Fajar", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
		{ID: acceptedID, Email: "acc@uinsgd.ac.id", FullName: "Raka", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
		{ID: outsiderID, Email: "out@uinsgd.ac.id", FullName: "Tamu", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
	} {
		_ = userRepo.Create(ctx, u)
	}

	groupID := uuid.New()
	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID:          groupID,
		HostID:      hostID,
		Title:       "Pemrograman Web",
		Category:    "Teknologi",
		Format:      domain.FormatOnline,
		StartTime:   time.Now().UTC().Add(24 * time.Hour),
		EndTime:     time.Now().UTC().Add(26 * time.Hour),
		MaxCapacity: 5,
		Status:      domain.StatusOpen,
	})
	_ = coHostRepo.Add(ctx, groupID, coHostID, hostID)
	_ = memberRepo.Create(ctx, &domain.Membership{ID: uuid.New(), GroupID: groupID, UserID: acceptedID, Status: domain.MembershipAccepted})

	groupSvc := service.NewGroupServiceWithDeps(groupRepo, userRepo, memberRepo)
	groupSvc.SetCoHostRepo(coHostRepo)
	groupSvc.SetMaterialRepo(matRepo)

	// Reject XSS javascript: URL
	if _, err := groupSvc.AddMaterial(ctx, coHostID, groupID, domain.CreateMaterialRequest{
		Title:        "Payload Bahaya",
		URL:          "javascript:alert(1)",
		MaterialType: "slide",
	}); !errors.Is(err, service.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for javascript: URL, got %v", err)
	}

	// Reject outsider trying to add or read materials
	if _, err := groupSvc.AddMaterial(ctx, acceptedID, groupID, domain.CreateMaterialRequest{
		Title: "Modul Peserta",
		URL:   "https://drive.google.com/file/123",
	}); !errors.Is(err, service.ErrUnauthorizedAction) {
		t.Fatalf("expected ErrUnauthorizedAction when participant adds material, got %v", err)
	}
	if _, err := groupSvc.ListMaterials(ctx, outsiderID, groupID); !errors.Is(err, service.ErrUnauthorizedAction) {
		t.Fatalf("expected ErrUnauthorizedAction when outsider reads materials, got %v", err)
	}

	// Co-Author adds valid slide material
	created, err := groupSvc.AddMaterial(ctx, coHostID, groupID, domain.CreateMaterialRequest{
		Title:        "Slide Pertemuan 1: Clean Architecture",
		URL:          "https://drive.google.com/drive/folders/abc123",
		MaterialType: "slide",
	})
	if err != nil {
		t.Fatalf("AddMaterial failed: %v", err)
	}
	if !strings.Contains(created.Title, "Clean Architecture") || created.MaterialType != "slide" {
		t.Fatalf("unexpected created material: %+v", created)
	}

	// Accepted participant can list materials
	mats, err := groupSvc.ListMaterials(ctx, acceptedID, groupID)
	if err != nil || len(mats) != 1 {
		t.Fatalf("expected accepted participant to see 1 material, got len=%d err=%v", len(mats), err)
	}

	// Co-Author can delete material
	if err := groupSvc.DeleteMaterial(ctx, coHostID, groupID, created.ID); err != nil {
		t.Fatalf("DeleteMaterial failed: %v", err)
	}
	matsAfter, _ := groupSvc.ListMaterials(ctx, hostID, groupID)
	if len(matsAfter) != 0 {
		t.Fatalf("expected 0 materials after deletion, got %d", len(matsAfter))
	}
}
