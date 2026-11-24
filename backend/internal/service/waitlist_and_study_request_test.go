package service_test

import (
	"context"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

func (m *mockMembershipRepoForPhase4) FindOldestWaitlisted(ctx context.Context, groupID uuid.UUID) (*domain.Membership, error) {
	var candidates []domain.Membership
	for _, mem := range m.list {
		if mem.GroupID == groupID && mem.Status == domain.MembershipWaitlisted {
			candidates = append(candidates, mem)
		}
	}
	if len(candidates) == 0 {
		return nil, repository.ErrMembershipNotFound
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		if !candidates[i].UpdatedAt.Equal(candidates[j].UpdatedAt) {
			return candidates[i].UpdatedAt.Before(candidates[j].UpdatedAt)
		}
		return candidates[i].CreatedAt.Before(candidates[j].CreatedAt)
	})
	cp := candidates[0]
	return &cp, nil
}

type mockStudyRequestRepo struct {
	mu       sync.Mutex
	requests map[uuid.UUID]*domain.StudyRequest
	votes    map[uuid.UUID]map[uuid.UUID]bool
	users    *mockUserRepository
}

func newMockStudyRequestRepo(users *mockUserRepository) *mockStudyRequestRepo {
	return &mockStudyRequestRepo{
		requests: make(map[uuid.UUID]*domain.StudyRequest),
		votes:    make(map[uuid.UUID]map[uuid.UUID]bool),
		users:    users,
	}
}

func (m *mockStudyRequestRepo) Create(ctx context.Context, req *domain.StudyRequest) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if req.ID == uuid.Nil {
		req.ID = uuid.New()
	}
	now := time.Now().UTC()
	req.CreatedAt = now
	req.UpdatedAt = now
	if req.Status == "" {
		req.Status = domain.StudyRequestOpen
	}
	cp := *req
	m.requests[req.ID] = &cp
	return nil
}

func (m *mockStudyRequestRepo) buildResponse(ctx context.Context, req *domain.StudyRequest, viewerID *uuid.UUID) domain.StudyRequestResponse {
	vMap := m.votes[req.ID]
	voteCount := 0
	userVoted := false
	for uid, ok := range vMap {
		if ok {
			voteCount++
			if viewerID != nil && uid == *viewerID {
				userVoted = true
			}
		}
	}
	var requesterResp *domain.UserResponse
	if m.users != nil {
		if u, err := m.users.FindByID(ctx, req.RequesterID); err == nil && u != nil {
			cp := domain.ToUserResponse(u, nil)
			cp.Email = ""
			requesterResp = &cp
		}
	}
	return domain.StudyRequestResponse{
		ID:               req.ID,
		RequesterID:      req.RequesterID,
		Title:            req.Title,
		Description:      req.Description,
		Category:         req.Category,
		PreferredFormat:  req.PreferredFormat,
		Status:           req.Status,
		FulfilledGroupID: req.FulfilledGroupID,
		VoteCount:        voteCount,
		UserVoted:        userVoted,
		CreatedAt:        req.CreatedAt,
		Requester:        requesterResp,
	}
}

func (m *mockStudyRequestRepo) List(ctx context.Context, filter domain.StudyRequestFilter, viewerID *uuid.UUID) ([]domain.StudyRequestResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]domain.StudyRequestResponse, 0)
	for _, req := range m.requests {
		if filter.Status != "" && req.Status != filter.Status {
			continue
		}
		if filter.Category != "" && filter.Category != "Semua" && req.Category != filter.Category {
			continue
		}
		out = append(out, m.buildResponse(ctx, req, viewerID))
	}
	return out, nil
}

func (m *mockStudyRequestRepo) FindByID(ctx context.Context, id uuid.UUID, viewerID *uuid.UUID) (*domain.StudyRequestResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	req, ok := m.requests[id]
	if !ok {
		return nil, repository.ErrStudyRequestNotFound
	}
	resp := m.buildResponse(ctx, req, viewerID)
	return &resp, nil
}

func (m *mockStudyRequestRepo) ToggleVote(ctx context.Context, requestID, userID uuid.UUID) (bool, int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.votes[requestID]; !ok {
		m.votes[requestID] = make(map[uuid.UUID]bool)
	}
	voted := false
	if m.votes[requestID][userID] {
		delete(m.votes[requestID], userID)
		voted = false
	} else {
		m.votes[requestID][userID] = true
		voted = true
	}
	return voted, len(m.votes[requestID]), nil
}

func (m *mockStudyRequestRepo) ListVoterIDs(ctx context.Context, requestID uuid.UUID) ([]uuid.UUID, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var ids []uuid.UUID
	for uid, ok := range m.votes[requestID] {
		if ok {
			ids = append(ids, uid)
		}
	}
	return ids, nil
}

func (m *mockStudyRequestRepo) MarkFulfilled(ctx context.Context, requestID, groupID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	req, ok := m.requests[requestID]
	if !ok {
		return repository.ErrStudyRequestNotFound
	}
	req.Status = domain.StudyRequestFulfilled
	gid := groupID
	req.FulfilledGroupID = &gid
	req.UpdatedAt = time.Now().UTC()
	return nil
}

func TestWaitlist_AutoEnqueueAndFIFOPromotion(t *testing.T) {
	ctx := context.Background()
	userRepo := newMockUserRepository()
	groupRepo := newMockGroupRepository()
	memberRepo := newMockMembershipRepoForPhase4(userRepo)
	notifier := &mockNotifierRecorder{}

	hostID := uuid.New()
	firstStudentID := uuid.New()
	waitStudent1ID := uuid.New()
	waitStudent2ID := uuid.New()

	for _, u := range []*domain.User{
		{ID: hostID, Email: "host@uinsgd.ac.id", FullName: "Tutor", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
		{ID: firstStudentID, Email: "s1@uinsgd.ac.id", FullName: "Peserta Satu", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
		{ID: waitStudent1ID, Email: "w1@uinsgd.ac.id", FullName: "Antrean Pertama", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
		{ID: waitStudent2ID, Email: "w2@uinsgd.ac.id", FullName: "Antrean Kedua", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
	} {
		_ = userRepo.Create(ctx, u)
	}

	groupID := uuid.New()
	start := time.Now().UTC().Add(24 * time.Hour)
	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID:          groupID,
		HostID:      hostID,
		Title:       "Kajian Ekonomi Islam",
		Category:    "Ekonomi & Bisnis Islam",
		Format:      domain.FormatOnline,
		StartTime:   start,
		EndTime:     start.Add(2 * time.Hour),
		MaxCapacity: 1,
		Status:      domain.StatusOpen,
	})

	memberSvc := service.NewMembershipService(memberRepo, groupRepo, &mockFeedbackRepoForPhase4{users: userRepo}, userRepo)
	memberSvc.SetNotifier(notifier)
	memberSvc.SetWaitlistRepo(memberRepo)

	// Seat 1 accepted (group is now full 1/1)
	m1, err := memberSvc.JoinGroup(ctx, firstStudentID, groupID)
	if err != nil {
		t.Fatalf("first JoinGroup failed: %v", err)
	}
	if err := memberSvc.UpdateStatus(ctx, hostID, m1.ID, domain.MembershipAccepted); err != nil {
		t.Fatalf("accept m1 failed: %v", err)
	}

	// Next two joins enter waitlist in FIFO order
	w1, err := memberSvc.JoinGroup(ctx, waitStudent1ID, groupID)
	if err != nil || w1.Status != domain.MembershipWaitlisted {
		t.Fatalf("expected waitStudent1 waitlisted, got err=%v status=%v", err, w1)
	}
	time.Sleep(2 * time.Millisecond)
	w2, err := memberSvc.JoinGroup(ctx, waitStudent2ID, groupID)
	if err != nil || w2.Status != domain.MembershipWaitlisted {
		t.Fatalf("expected waitStudent2 waitlisted, got err=%v status=%v", err, w2)
	}

	// Accepted member cancels -> oldest waitlisted (waitStudent1) is auto-promoted to pending
	if err := memberSvc.UpdateStatus(ctx, firstStudentID, m1.ID, domain.MembershipCancelled); err != nil {
		t.Fatalf("cancel m1 failed: %v", err)
	}

	w1After, _ := memberRepo.FindByID(ctx, w1.ID)
	w2After, _ := memberRepo.FindByID(ctx, w2.ID)
	if w1After.Status != domain.MembershipPending {
		t.Fatalf("expected oldest waitlist member promoted to pending, got %s", w1After.Status)
	}
	if w2After.Status != domain.MembershipWaitlisted {
		t.Fatalf("expected second waitlist member to stay waitlisted, got %s", w2After.Status)
	}

	promotedNotified := false
	for _, ev := range notifier.events {
		if ev.UserID == waitStudent1ID && ev.Type == domain.NotificationWaitlistPromoted {
			promotedNotified = true
			break
		}
	}
	if !promotedNotified {
		t.Fatal("expected NotificationWaitlistPromoted sent to promoted waitlisted student")
	}
}

func TestStudyRequestBoard_CreateVoteAndFulfillFromGroup(t *testing.T) {
	ctx := context.Background()
	userRepo := newMockUserRepository()
	groupRepo := newMockGroupRepository()
	srRepo := newMockStudyRequestRepo(userRepo)
	notifier := &mockNotifierRecorder{}

	requesterID := uuid.New()
	supporterID := uuid.New()
	tutorID := uuid.New()
	for _, u := range []*domain.User{
		{ID: requesterID, Email: "req@uinsgd.ac.id", FullName: "Aulia", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
		{ID: supporterID, Email: "sup@uinsgd.ac.id", FullName: "Rizky", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
		{ID: tutorID, Email: "tut@uinsgd.ac.id", FullName: "Nabila", Role: domain.RoleStudent, AccountStatus: domain.AccountActive},
	} {
		_ = userRepo.Create(ctx, u)
	}

	srSvc := service.NewStudyRequestService(srRepo, userRepo)
	srSvc.SetNotifier(notifier)
	groupSvc := service.NewGroupServiceWithDeps(groupRepo, userRepo, nil)
	groupSvc.SetStudyRequestFulfiller(srSvc)

	created, err := srSvc.Create(ctx, requesterID, domain.CreateStudyRequestPayload{
		Title:           "Bedah Skripsi Kualitatif NVivo Psikologi",
		Description:     "Butuh pendampingan coding wawancara skripsi.",
		Category:        "Psikologi",
		PreferredFormat: domain.FormatOnline,
	})
	if err != nil {
		t.Fatalf("Create study request failed: %v", err)
	}
	if created.VoteCount != 1 || !created.UserVoted {
		t.Fatalf("expected auto vote count=1 user_voted=true, got count=%d voted=%v", created.VoteCount, created.UserVoted)
	}

	voteRes, err := srSvc.ToggleVote(ctx, created.ID, supporterID)
	if err != nil || !voteRes.Voted || voteRes.VoteCount != 2 {
		t.Fatalf("expected supporter vote count=2, got %+v err=%v", voteRes, err)
	}

	// Tutor fulfills request by opening a session linked to study_request_id
	start := time.Now().UTC().Add(48 * time.Hour)
	createdGroup, err := groupSvc.Create(ctx, tutorID, domain.CreateGroupRequest{
		Title:          "Klinik Coding Wawancara Kualitatif & NVivo",
		Description:    "Menjawab usulan teman-teman Psikologi.",
		Category:       "Psikologi",
		Format:         domain.FormatOnline,
		LocationOrLink: "https://meet.google.com/nvivo-uinsgd",
		StartTime:      start,
		EndTime:        start.Add(2 * time.Hour),
		MaxCapacity:    10,
		StudyRequestID: &created.ID,
	})
	if err != nil {
		t.Fatalf("Create group from study request failed: %v", err)
	}

	fulfilled, err := srRepo.FindByID(ctx, created.ID, &requesterID)
	if err != nil {
		t.Fatalf("FindByID failed: %v", err)
	}
	if fulfilled.Status != domain.StudyRequestFulfilled || fulfilled.FulfilledGroupID == nil || *fulfilled.FulfilledGroupID != createdGroup.ID {
		t.Fatalf("expected request status=fulfilled linked to %s, got %+v", createdGroup.ID, fulfilled)
	}

	notifiedSupporter := false
	for _, ev := range notifier.events {
		if ev.UserID == supporterID && ev.Type == domain.NotificationRequestFulfilled {
			notifiedSupporter = true
		}
	}
	if !notifiedSupporter {
		t.Fatal("expected NotificationRequestFulfilled sent to requester/voters")
	}
}
