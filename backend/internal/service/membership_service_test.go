package service_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/handler"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

type sessionsGroupRepository struct {
	*mockGroupRepository
	listByHostErr error
	findByID      func(context.Context, uuid.UUID) (*domain.GroupResponse, error)
}

func (r *sessionsGroupRepository) ListByHost(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error) {
	groups, err := r.mockGroupRepository.ListByHost(ctx, userID)
	if err != nil {
		return nil, err
	}
	return groups, r.listByHostErr
}

func (r *sessionsGroupRepository) FindByID(ctx context.Context, groupID uuid.UUID) (*domain.GroupResponse, error) {
	if r.findByID != nil {
		return r.findByID(ctx, groupID)
	}
	return r.mockGroupRepository.FindByID(ctx, groupID)
}

type sessionsMembershipRepository struct {
	repository.MembershipRepository
	memberships []domain.Membership
	listErr     error
}

func (r *sessionsMembershipRepository) ListByUser(context.Context, uuid.UUID) ([]domain.Membership, error) {
	return r.memberships, r.listErr
}

func newSessionsFixture() (*sessionsGroupRepository, *sessionsMembershipRepository, uuid.UUID) {
	userID := uuid.New()
	groups := &sessionsGroupRepository{mockGroupRepository: newMockGroupRepository()}
	hosted := &domain.LearningGroup{ID: uuid.New(), HostID: userID, Title: "Bimbingan Algoritma"}
	first := &domain.LearningGroup{ID: uuid.New(), HostID: uuid.New(), Title: "Diskusi Struktur Data"}
	second := &domain.LearningGroup{ID: uuid.New(), HostID: uuid.New(), Title: "Diskusi Basis Data"}
	for _, group := range []*domain.LearningGroup{hosted, first, second} {
		groups.groups[group.ID] = group
	}
	memberships := &sessionsMembershipRepository{memberships: []domain.Membership{
		{ID: uuid.New(), UserID: userID, GroupID: first.ID, Status: domain.MembershipAccepted},
		{ID: uuid.New(), UserID: userID, GroupID: second.ID, Status: domain.MembershipPending},
	}}
	return groups, memberships, userID
}

type sessionsFailureCase struct {
	name      string
	configure func(*sessionsGroupRepository, *sessionsMembershipRepository)
	cause     error
	operation string
}

func sessionsFailureCases() []sessionsFailureCase {
	failure := errors.New("private database connection detail")
	return []sessionsFailureCase{
		{
			name: "ListByHost discards returned rows on error",
			configure: func(groups *sessionsGroupRepository, _ *sessionsMembershipRepository) {
				groups.listByHostErr = failure
			},
			cause: failure, operation: "ListByHost",
		},
		{
			name: "ListByUser discards earlier hosted rows and returned memberships",
			configure: func(_ *sessionsGroupRepository, memberships *sessionsMembershipRepository) {
				memberships.listErr = failure
			},
			cause: failure, operation: "ListByUser",
		},
		{
			name: "FindByID first failure discards hosted rows",
			configure: func(groups *sessionsGroupRepository, _ *sessionsMembershipRepository) {
				groups.findByID = func(context.Context, uuid.UUID) (*domain.GroupResponse, error) {
					return nil, failure
				}
			},
			cause: failure, operation: "FindByID",
		},
		{
			name: "FindByID later failure discards hosted and earlier joined rows",
			configure: func(groups *sessionsGroupRepository, memberships *sessionsMembershipRepository) {
				failedID := memberships.memberships[1].GroupID
				groups.findByID = func(ctx context.Context, groupID uuid.UUID) (*domain.GroupResponse, error) {
					group, err := groups.mockGroupRepository.FindByID(ctx, groupID)
					if groupID == failedID {
						return group, failure
					}
					return group, err
				}
			},
			cause: failure, operation: "FindByID",
		},
		{
			name: "FindByID not found is not silently skipped",
			configure: func(groups *sessionsGroupRepository, memberships *sessionsMembershipRepository) {
				delete(groups.groups, memberships.memberships[1].GroupID)
			},
			cause: repository.ErrGroupNotFound, operation: "FindByID",
		},
		{
			name: "FindByID nil group discards earlier partial data",
			configure: func(groups *sessionsGroupRepository, memberships *sessionsMembershipRepository) {
				failedID := memberships.memberships[1].GroupID
				groups.findByID = func(ctx context.Context, groupID uuid.UUID) (*domain.GroupResponse, error) {
					if groupID == failedID {
						return nil, nil
					}
					return groups.mockGroupRepository.FindByID(ctx, groupID)
				}
			},
			operation: "FindByID",
		},
	}
}

func TestMembershipService_GetMySessions_RepositoryFailures(t *testing.T) {
	for _, tc := range sessionsFailureCases() {
		t.Run(tc.name, func(t *testing.T) {
			groups, memberships, userID := newSessionsFixture()
			tc.configure(groups, memberships)
			svc := service.NewMembershipService(memberships, groups, nil)

			response, err := svc.GetMySessions(context.Background(), userID)

			if response != nil {
				t.Errorf("repository failure must return nil response, got %+v", response)
			}
			if err == nil {
				t.Fatal("expected repository failure, got nil error")
			}
			if tc.cause != nil {
				if !errors.Is(err, tc.cause) {
					t.Errorf("expected wrapped cause %v, got %v", tc.cause, err)
				}
				if err == tc.cause {
					t.Error("expected service context wrapping, got bare repository error")
				}
			}
			if !strings.Contains(err.Error(), "GetMySessions") || !strings.Contains(err.Error(), tc.operation) {
				t.Errorf("error lacks service/operation context: %v", err)
			}
		})
	}
}

func TestMembershipService_GetMySessions_Empty(t *testing.T) {
	for _, tc := range []struct {
		name        string
		memberships []domain.Membership
	}{
		{name: "nil repository slices"},
		{name: "empty memberships", memberships: []domain.Membership{}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			groups := newMockGroupRepository()
			memberships := &sessionsMembershipRepository{memberships: tc.memberships}
			svc := service.NewMembershipService(memberships, groups, nil)

			response, err := svc.GetMySessions(context.Background(), uuid.New())
			if err != nil {
				t.Fatalf("expected empty success, got %v", err)
			}
			if response == nil {
				t.Fatal("expected non-nil response")
			}
			if response.Hosted == nil || response.Joined == nil {
				t.Errorf("expected non-nil empty arrays, got %+v", response)
			}
			body, err := json.Marshal(response)
			if err != nil {
				t.Fatalf("marshal sessions: %v", err)
			}
			if string(body) != `{"hosted":[],"joined":[]}` {
				t.Errorf("expected empty JSON arrays, got %s", body)
			}
		})
	}
}

func TestMembershipService_GetMySessions_DataAndMembershipStatus(t *testing.T) {
	groups, memberships, userID := newSessionsFixture()
	svc := service.NewMembershipService(memberships, groups, nil)

	response, err := svc.GetMySessions(context.Background(), userID)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if response == nil || len(response.Hosted) != 1 || len(response.Joined) != 2 {
		t.Fatalf("expected one hosted and two joined sessions, got %+v", response)
	}
	if response.Hosted[0].HostID != userID || response.Hosted[0].Title != "Bimbingan Algoritma" {
		t.Errorf("unexpected hosted session: %+v", response.Hosted[0])
	}
	for i, want := range []struct {
		title  string
		status domain.MembershipStatus
	}{
		{title: "Diskusi Struktur Data", status: domain.MembershipAccepted},
		{title: "Diskusi Basis Data", status: domain.MembershipPending},
	} {
		group := response.Joined[i]
		if group.ID != memberships.memberships[i].GroupID || group.Title != want.title {
			t.Errorf("joined[%d] has wrong group: %+v", i, group)
		}
		if group.UserMembership == nil || *group.UserMembership != want.status {
			t.Errorf("joined[%d] expected membership %s, got %v", i, want.status, group.UserMembership)
		}
	}
}

func TestMembershipService_GetMySessions_HTTPRepositoryFailures(t *testing.T) {
	for _, tc := range sessionsFailureCases() {
		t.Run(tc.name, func(t *testing.T) {
			groups, memberships, userID := newSessionsFixture()
			tc.configure(groups, memberships)
			svc := service.NewMembershipService(memberships, groups, nil)
			h := handler.NewMembershipHandler(svc)
			app := fiber.New(fiber.Config{DisableStartupMessage: true})
			app.Get("/my-sessions", func(c *fiber.Ctx) error {
				c.Locals("userID", userID)
				return c.Next()
			}, h.GetMySessions)

			response, err := app.Test(httptest.NewRequest(http.MethodGet, "/my-sessions", nil))
			if err != nil {
				t.Fatalf("request my-sessions: %v", err)
			}
			defer func() {
				if err := response.Body.Close(); err != nil {
					t.Errorf("close response body: %v", err)
				}
			}()
			if response.StatusCode != http.StatusInternalServerError {
				t.Errorf("expected HTTP 500, got %d", response.StatusCode)
			}
			var body map[string]any
			if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			want := map[string]any{
				"success": false,
				"error": map[string]any{
					"code":    "FETCH_FAILED",
					"message": "Gagal memuat sesi belajar Anda",
				},
			}
			if !reflect.DeepEqual(body, want) {
				t.Errorf("expected safe failure without partial data or internals, got %#v", body)
			}
		})
	}
}

type fullMockMembershipRepo struct {
	items map[uuid.UUID]*domain.Membership
}

func newFullMockMembershipRepo() *fullMockMembershipRepo {
	return &fullMockMembershipRepo{items: make(map[uuid.UUID]*domain.Membership)}
}

func (r *fullMockMembershipRepo) Create(_ context.Context, m *domain.Membership) error {
	cp := *m
	r.items[m.ID] = &cp
	return nil
}

func (r *fullMockMembershipRepo) Find(_ context.Context, groupID, userID uuid.UUID) (*domain.Membership, error) {
	for _, m := range r.items {
		if m.GroupID == groupID && m.UserID == userID {
			cp := *m
			return &cp, nil
		}
	}
	return nil, repository.ErrMembershipNotFound
}

func (r *fullMockMembershipRepo) FindByID(_ context.Context, id uuid.UUID) (*domain.Membership, error) {
	m, ok := r.items[id]
	if !ok {
		return nil, repository.ErrMembershipNotFound
	}
	cp := *m
	return &cp, nil
}

func (r *fullMockMembershipRepo) ListByGroup(_ context.Context, groupID uuid.UUID) ([]domain.Membership, error) {
	var out []domain.Membership
	for _, m := range r.items {
		if m.GroupID == groupID {
			cp := *m
			if m.User != nil {
				u := *m.User
				cp.User = &u
			}
			out = append(out, cp)
		}
	}
	return out, nil
}

func (r *fullMockMembershipRepo) ListByUser(_ context.Context, userID uuid.UUID) ([]domain.Membership, error) {
	var out []domain.Membership
	for _, m := range r.items {
		if m.UserID == userID {
			out = append(out, *m)
		}
	}
	return out, nil
}

func (r *fullMockMembershipRepo) UpdateStatus(_ context.Context, id uuid.UUID, status domain.MembershipStatus) error {
	m, ok := r.items[id]
	if !ok {
		return repository.ErrMembershipNotFound
	}
	m.Status = status
	return nil
}

func (r *fullMockMembershipRepo) CountAccepted(_ context.Context, groupID uuid.UUID) (int, error) {
	count := 0
	for _, m := range r.items {
		if m.GroupID == groupID && (m.Status == domain.MembershipAccepted || m.Status == domain.MembershipAttended) {
			count++
		}
	}
	return count, nil
}

type pointTrackingFeedbackRepo struct {
	mockFeedbackRepoForEngagement
	points map[uuid.UUID]int
}

func (p *pointTrackingFeedbackRepo) AddContributionPoints(_ context.Context, userID uuid.UUID, pts int) error {
	if p.points == nil {
		p.points = make(map[uuid.UUID]int)
	}
	p.points[userID] += pts
	return nil
}

func TestMembershipService_RejoinAfterCancel(t *testing.T) {
	ctx := context.Background()
	groupRepo := newMockGroupRepository()
	memRepo := newFullMockMembershipRepo()
	hostID := uuid.New()
	studentID := uuid.New()
	groupID := uuid.New()
	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID: groupID, HostID: hostID, Title: "Kalkulus I", Status: domain.StatusOpen, MaxCapacity: 5,
	})

	svc := service.NewMembershipService(memRepo, groupRepo, nil)
	joined, err := svc.JoinGroup(ctx, studentID, groupID)
	if err != nil {
		t.Fatalf("initial join failed: %v", err)
	}
	if err := svc.UpdateStatus(ctx, studentID, joined.ID, domain.MembershipCancelled); err != nil {
		t.Fatalf("cancel membership failed: %v", err)
	}

	rejoined, err := svc.JoinGroup(ctx, studentID, groupID)
	if err != nil {
		t.Fatalf("rejoin after cancel failed: %v", err)
	}
	if rejoined.Status != domain.MembershipPending {
		t.Errorf("expected rejoined status pending, got %s", rejoined.Status)
	}
}

func TestMembershipService_UpdateStatusIdempotentNoDoublePoints(t *testing.T) {
	ctx := context.Background()
	groupRepo := newMockGroupRepository()
	memRepo := newFullMockMembershipRepo()
	fbRepo := &pointTrackingFeedbackRepo{}
	hostID := uuid.New()
	studentID := uuid.New()
	groupID := uuid.New()
	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID: groupID, HostID: hostID, Title: "Fiqh Muamalah", Status: domain.StatusOpen, MaxCapacity: 2,
	})

	svc := service.NewMembershipService(memRepo, groupRepo, fbRepo)
	joined, err := svc.JoinGroup(ctx, studentID, groupID)
	if err != nil {
		t.Fatalf("join failed: %v", err)
	}

	if err := svc.UpdateStatus(ctx, hostID, joined.ID, domain.MembershipAccepted); err != nil {
		t.Fatalf("first accept failed: %v", err)
	}
	if err := svc.UpdateStatus(ctx, hostID, joined.ID, domain.MembershipAccepted); err != nil {
		t.Fatalf("idempotent accept failed: %v", err)
	}
	if fbRepo.points[hostID] != 2 {
		t.Errorf("expected host contribution points to be 2 once, got %d", fbRepo.points[hostID])
	}
}

func TestMembershipService_GetGroupMembersPrivacy(t *testing.T) {
	ctx := context.Background()
	groupRepo := newMockGroupRepository()
	memRepo := newFullMockMembershipRepo()
	hostID := uuid.New()
	acceptedID := uuid.New()
	pendingID := uuid.New()
	strangerID := uuid.New()
	groupID := uuid.New()
	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID: groupID, HostID: hostID, Title: "Ekonomi Syariah", Status: domain.StatusOpen, MaxCapacity: 5,
	})
	memRepo.items[uuid.New()] = &domain.Membership{
		ID: uuid.New(), GroupID: groupID, UserID: acceptedID, Status: domain.MembershipAccepted,
		User: &domain.User{ID: acceptedID, FullName: "Alya", Email: "alya@student.uinsgd.ac.id"},
	}
	memRepo.items[uuid.New()] = &domain.Membership{
		ID: uuid.New(), GroupID: groupID, UserID: pendingID, Status: domain.MembershipPending,
		User: &domain.User{ID: pendingID, FullName: "Bima", Email: "bima@student.uinsgd.ac.id"},
	}

	svc := service.NewMembershipService(memRepo, groupRepo, nil)

	publicMembers, err := svc.GetGroupMembers(ctx, groupID, strangerID)
	if err != nil {
		t.Fatalf("GetGroupMembers public failed: %v", err)
	}
	if len(publicMembers) != 1 {
		t.Fatalf("expected only 1 accepted member visible to stranger, got %d", len(publicMembers))
	}
	if publicMembers[0].User != nil && publicMembers[0].User.Email != "" {
		t.Errorf("expected member email to be redacted for stranger, got %s", publicMembers[0].User.Email)
	}

	hostMembers, err := svc.GetGroupMembers(ctx, groupID, hostID)
	if err != nil {
		t.Fatalf("GetGroupMembers host failed: %v", err)
	}
	if len(hostMembers) != 2 {
		t.Fatalf("expected 2 members (accepted + pending) visible to host, got %d", len(hostMembers))
	}
}

func TestMembershipService_AttendanceTransitionsAndPoints(t *testing.T) {
	ctx := context.Background()
	groupRepo := newMockGroupRepository()
	memRepo := newFullMockMembershipRepo()
	fbRepo := &pointTrackingFeedbackRepo{}
	userRepo := newMockUserRepository()
	notifRepo := newMockNotificationRepo()
	notifSvc := service.NewNotificationService(notifRepo)

	hostID := uuid.New()
	studentID := uuid.New()
	otherStudentID := uuid.New()
	groupID := uuid.New()
	_ = userRepo.Create(ctx, &domain.User{ID: studentID, FullName: "Ahmad Fauzi", Email: "ahmad@student.uinsgd.ac.id", Role: domain.RoleStudent})
	_ = userRepo.Create(ctx, &domain.User{ID: otherStudentID, FullName: "Citra", Email: "citra@student.uinsgd.ac.id", Role: domain.RoleStudent})
	_ = groupRepo.Create(ctx, &domain.LearningGroup{
		ID: groupID, HostID: hostID, Title: "Klinik Riset Psikologi", Status: domain.StatusOpen, MaxCapacity: 1,
	})

	svc := service.NewMembershipService(memRepo, groupRepo, fbRepo, userRepo)
	svc.SetNotifier(notifSvc)

	joined, err := svc.JoinGroup(ctx, studentID, groupID)
	if err != nil {
		t.Fatalf("JoinGroup failed: %v", err)
	}

	// Cannot mark pending membership attended directly
	err = svc.UpdateStatus(ctx, hostID, joined.ID, domain.MembershipAttended)
	if !errors.Is(err, service.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput marking pending member attended, got %v", err)
	}

	// Accept (+2 host points) -> attend (+3 host, +1 participant)
	if err := svc.UpdateStatus(ctx, hostID, joined.ID, domain.MembershipAccepted); err != nil {
		t.Fatalf("UpdateStatus accept failed: %v", err)
	}
	if err := svc.UpdateStatus(ctx, hostID, joined.ID, domain.MembershipAttended); err != nil {
		t.Fatalf("UpdateStatus attend failed: %v", err)
	}
	// Repeating attend or accept stays idempotent without extra points or downgrades
	if err := svc.UpdateStatus(ctx, hostID, joined.ID, domain.MembershipAttended); err != nil {
		t.Fatalf("repeat attend failed: %v", err)
	}
	if err := svc.UpdateStatus(ctx, hostID, joined.ID, domain.MembershipAccepted); err != nil {
		t.Fatalf("accept after attend failed: %v", err)
	}

	updated, _ := memRepo.FindByID(ctx, joined.ID)
	if updated.Status != domain.MembershipAttended {
		t.Errorf("expected membership status to stay attended, got %s", updated.Status)
	}
	if fbRepo.points[hostID] != 5 {
		t.Errorf("expected host points 5 (+2 accept +3 attend), got %d", fbRepo.points[hostID])
	}
	if fbRepo.points[studentID] != 1 {
		t.Errorf("expected student points 1, got %d", fbRepo.points[studentID])
	}

	// Attended member still counts toward group capacity
	otherJoined, err := svc.JoinGroup(ctx, otherStudentID, groupID)
	if err != nil {
		t.Fatalf("other JoinGroup failed: %v", err)
	}
	err = svc.UpdateStatus(ctx, hostID, otherJoined.ID, domain.MembershipAccepted)
	if !errors.Is(err, service.ErrGroupFull) {
		t.Fatalf("expected ErrGroupFull when attended member fills capacity, got %v", err)
	}

	// Rejecting emits notification too
	if err := svc.UpdateStatus(ctx, hostID, otherJoined.ID, domain.MembershipRejected); err != nil {
		t.Fatalf("UpdateStatus reject failed: %v", err)
	}

	hostNotifs, _ := notifSvc.ListForUser(ctx, hostID, 10)
	if len(hostNotifs.Notifications) != 2 {
		t.Errorf("expected 2 join request notifications for host, got %d", len(hostNotifs.Notifications))
	}
	studentNotifs, _ := notifSvc.ListForUser(ctx, studentID, 10)
	if len(studentNotifs.Notifications) != 2 {
		t.Errorf("expected 2 notifications (accepted + attended) for student, got %d", len(studentNotifs.Notifications))
	}
	otherNotifs, _ := notifSvc.ListForUser(ctx, otherStudentID, 10)
	if len(otherNotifs.Notifications) != 1 || otherNotifs.Notifications[0].Type != domain.NotificationMembershipRejected {
		t.Errorf("expected 1 rejection notification for other student, got %+v", otherNotifs.Notifications)
	}
}
