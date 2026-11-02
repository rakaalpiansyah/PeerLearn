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
