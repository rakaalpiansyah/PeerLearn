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
	return &domain.GroupResponse{
		ID:             g.ID,
		HostID:         g.HostID,
		Title:          g.Title,
		Description:    g.Description,
		Category:       g.Category,
		Format:         g.Format,
		LocationOrLink: g.LocationOrLink,
		StartTime:      g.StartTime,
		EndTime:        g.EndTime,
		MaxCapacity:    g.MaxCapacity,
		Status:         g.Status,
	}, nil
}

func (m *mockGroupRepository) List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error) {
	var list []domain.GroupResponse
	for _, g := range m.groups {
		list = append(list, domain.GroupResponse{
			ID:          g.ID,
			HostID:      g.HostID,
			Title:       g.Title,
			MaxCapacity: g.MaxCapacity,
			Status:      g.Status,
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

func (m *mockGroupRepository) ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error) {
	var list []domain.GroupResponse
	for _, g := range m.groups {
		if g.HostID == hostID {
			list = append(list, domain.GroupResponse{ID: g.ID, HostID: g.HostID, Title: g.Title})
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
		res, err := svc.ResolveMapLink(ctx, "-6.365300, 106.831500")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Latitude != -6.3653 || res.Longitude != 106.8315 {
			t.Errorf("expected lat -6.3653, lng 106.8315, got %f, %f", res.Latitude, res.Longitude)
		}
	})

	t.Run("Direct coordinates without space", func(t *testing.T) {
		res, err := svc.ResolveMapLink(ctx, "-6.892900,107.610600")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Latitude != -6.8929 || res.Longitude != 107.6106 {
			t.Errorf("expected lat -6.8929, lng 107.6106, got %f, %f", res.Latitude, res.Longitude)
		}
	})

	t.Run("Google Maps Place URL with coordinates and place name", func(t *testing.T) {
		url := "https://www.google.com/maps/place/Perpustakaan+Pusat+UI/@-6.365300,106.831500,17z/data=!3m1!4b1"
		res, err := svc.ResolveMapLink(ctx, url)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Latitude != -6.3653 || res.Longitude != 106.8315 {
			t.Errorf("expected lat -6.3653, lng 106.8315, got %f, %f", res.Latitude, res.Longitude)
		}
		if res.PlaceName != "Perpustakaan Pusat UI" {
			t.Errorf("expected place 'Perpustakaan Pusat UI', got '%s'", res.PlaceName)
		}
	})

	t.Run("Google Maps Query URL with q parameter", func(t *testing.T) {
		url := "https://maps.google.com/?q=-6.364400,106.828600"
		res, err := svc.ResolveMapLink(ctx, url)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Latitude != -6.3644 || res.Longitude != 106.8286 {
			t.Errorf("expected lat -6.3644, lng 106.8286, got %f, %f", res.Latitude, res.Longitude)
		}
	})

	t.Run("SSRF protection: rejects non-google domains", func(t *testing.T) {
		url := "https://evil-hacker.com/steal?q=-6.364400,106.828600"
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
