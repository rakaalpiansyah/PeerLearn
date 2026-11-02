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

type mockFeedbackRepoForEngagement struct{}

func (m *mockFeedbackRepoForEngagement) Create(ctx context.Context, f *domain.Feedback) error {
	return nil
}
func (m *mockFeedbackRepoForEngagement) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.Feedback, error) {
	return nil, nil
}
func (m *mockFeedbackRepoForEngagement) ListByReviewer(ctx context.Context, reviewerID uuid.UUID) ([]domain.Feedback, error) {
	return nil, nil
}
func (m *mockFeedbackRepoForEngagement) AddContributionPoints(ctx context.Context, userID uuid.UUID, points int) error {
	return nil
}
func (m *mockFeedbackRepoForEngagement) HasReviewed(ctx context.Context, groupID, reviewerID uuid.UUID) (bool, error) {
	return false, nil
}

type mockReportRepoForEngagement struct {
	reports []domain.Report
}

func (m *mockReportRepoForEngagement) Create(ctx context.Context, r *domain.Report) error {
	cp := *r
	if cp.CreatedAt.IsZero() {
		cp.CreatedAt = time.Now().UTC()
	}
	m.reports = append(m.reports, cp)
	return nil
}

func (m *mockReportRepoForEngagement) ListAll(ctx context.Context) ([]domain.Report, error) {
	return m.reports, nil
}

func (m *mockReportRepoForEngagement) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ReportStatus) error {
	for i := range m.reports {
		if m.reports[i].ID == id {
			m.reports[i].Status = status
			return nil
		}
	}
	return nil
}

func (m *mockReportRepoForEngagement) CountUniqueReportersLast7Days(ctx context.Context, reportedUserID uuid.UUID) (int, error) {
	uniqueReporters := make(map[uuid.UUID]bool)
	cutoff := time.Now().Add(-7 * 24 * time.Hour)
	for _, r := range m.reports {
		if r.ReportedUserID != nil && *r.ReportedUserID == reportedUserID && r.CreatedAt.After(cutoff) {
			uniqueReporters[r.ReporterID] = true
		}
	}
	return len(uniqueReporters), nil
}

func (m *mockReportRepoForEngagement) HasPendingReport(ctx context.Context, reporterID uuid.UUID, targetGroupID, reportedUserID *uuid.UUID) (bool, error) {
	for _, r := range m.reports {
		if r.ReporterID == reporterID && r.Status == domain.ReportPending {
			if targetGroupID != nil && r.TargetGroupID != nil && *r.TargetGroupID == *targetGroupID {
				return true, nil
			}
			if reportedUserID != nil && r.ReportedUserID != nil && *r.ReportedUserID == *reportedUserID {
				return true, nil
			}
		}
	}
	return false, nil
}

func (m *mockReportRepoForEngagement) ListWithDetails(ctx context.Context) ([]domain.ModerationReportItem, error) {
	var items []domain.ModerationReportItem
	for _, r := range m.reports {
		items = append(items, domain.ModerationReportItem{Report: r})
	}
	return items, nil
}

func (m *mockReportRepoForEngagement) ResolveUserReports(ctx context.Context, reportedUserID uuid.UUID) error {
	for i := range m.reports {
		if m.reports[i].ReportedUserID != nil && *m.reports[i].ReportedUserID == reportedUserID {
			m.reports[i].Status = domain.ReportResolved
		}
	}
	return nil
}

type mockGroupRepoForEngagement struct {
	groups map[uuid.UUID]*domain.GroupResponse
}

func (m *mockGroupRepoForEngagement) Create(ctx context.Context, group *domain.LearningGroup) error {
	return nil
}
func (m *mockGroupRepoForEngagement) FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupResponse, error) {
	g, ok := m.groups[id]
	if !ok {
		return nil, repository.ErrGroupNotFound
	}
	return g, nil
}
func (m *mockGroupRepoForEngagement) List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error) {
	return nil, nil
}
func (m *mockGroupRepoForEngagement) Update(ctx context.Context, group *domain.LearningGroup) error {
	return nil
}
func (m *mockGroupRepoForEngagement) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.GroupStatus) error {
	if g, ok := m.groups[id]; ok {
		g.Status = status
	}
	return nil
}
func (m *mockGroupRepoForEngagement) ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error) {
	return nil, nil
}
func (m *mockGroupRepoForEngagement) FindRecommendations(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error) {
	return nil, nil
}
func (m *mockGroupRepoForEngagement) CancelByHost(ctx context.Context, hostID uuid.UUID) error {
	for _, g := range m.groups {
		if g.HostID == hostID && (g.Status == domain.StatusOpen || g.Status == domain.StatusOngoing) {
			g.Status = domain.StatusCancelled
		}
	}
	return nil
}

func TestEngagementService_AutoRestrictOn3UniqueReports(t *testing.T) {
	feedbackRepo := &mockFeedbackRepoForEngagement{}
	reportRepo := &mockReportRepoForEngagement{}
	hostID := uuid.New()
	groupID := uuid.New()
	groupRepo := &mockGroupRepoForEngagement{
		groups: map[uuid.UUID]*domain.GroupResponse{
			groupID: {ID: groupID, HostID: hostID, Title: "Sesi Joki Tugas", Status: domain.StatusOpen},
		},
	}
	userRepo := newMockUserRepository()
	hostUser := &domain.User{
		ID:            hostID,
		Email:         "badactor@example.com",
		FullName:      "Oknum Pelanggar",
		AccountStatus: domain.AccountActive,
	}
	_ = userRepo.Create(context.Background(), hostUser)

	engService := service.NewEngagementService(feedbackRepo, reportRepo, groupRepo, userRepo)

	reporter1 := uuid.New()
	reporter2 := uuid.New()
	reporter3 := uuid.New()

	// 1st report from reporter1 on group (should link hostID)
	_, err := engService.CreateReport(context.Background(), reporter1, domain.CreateReportRequest{
		TargetGroupID: &groupID,
		Reason:        "Komersialisasi Joki Tugas",
		Details:       "Menawarkan jasa pengerjaan tugas berbayar",
	})
	if err != nil {
		t.Fatalf("first report failed: %v", err)
	}

	u, _ := userRepo.FindByID(context.Background(), hostID)
	if u.AccountStatus != domain.AccountActive {
		t.Errorf("expected still active after 1 report")
	}

	// Duplicate report from reporter1 should be rejected
	_, err = engService.CreateReport(context.Background(), reporter1, domain.CreateReportRequest{
		TargetGroupID: &groupID,
		Reason:        "Komersialisasi Joki Tugas",
	})
	if err == nil {
		t.Errorf("expected duplicate report error from same reporter")
	}

	// 2nd report from reporter2
	_, err = engService.CreateReport(context.Background(), reporter2, domain.CreateReportRequest{
		ReportedUserID: &hostID,
		Reason:         "Penipuan Akun",
		Details:        "Bukan mahasiswa FST",
	})
	if err != nil {
		t.Fatalf("second report failed: %v", err)
	}

	u, _ = userRepo.FindByID(context.Background(), hostID)
	if u.AccountStatus != domain.AccountActive {
		t.Errorf("expected still active after 2 reports")
	}

	// 3rd report from reporter3 -> triggers auto-restrict!
	_, err = engService.CreateReport(context.Background(), reporter3, domain.CreateReportRequest{
		ReportedUserID: &hostID,
		Reason:         "Pelecehan Peserta",
		Details:        "Mengirim pesan tidak pantas",
	})
	if err != nil {
		t.Fatalf("third report failed: %v", err)
	}

	u, _ = userRepo.FindByID(context.Background(), hostID)
	if u.AccountStatus != domain.AccountRestricted {
		t.Fatalf("expected host to be restricted after 3 unique reports, got '%s'", u.AccountStatus)
	}
	if u.RestrictionNote == "" {
		t.Errorf("expected restriction note to be set")
	}
}

func TestEngagementService_AdminModerateUser_RestoreAndSuspend(t *testing.T) {
	feedbackRepo := &mockFeedbackRepoForEngagement{}
	reportRepo := &mockReportRepoForEngagement{}
	targetUserID := uuid.New()
	targetGroupID := uuid.New()
	groupRepo := &mockGroupRepoForEngagement{
		groups: map[uuid.UUID]*domain.GroupResponse{
			targetGroupID: {ID: targetGroupID, HostID: targetUserID, Title: "Sesi Belajar", Status: domain.StatusOpen},
		},
	}
	userRepo := newMockUserRepository()
	targetUser := &domain.User{
		ID:              targetUserID,
		Email:           "restricted@example.com",
		FullName:        "Target User",
		AccountStatus:   domain.AccountRestricted,
		RestrictionNote: "Dibatasi otomatis sementara",
	}
	_ = userRepo.Create(context.Background(), targetUser)

	_ = reportRepo.Create(context.Background(), &domain.Report{
		ID:             uuid.New(),
		ReporterID:     uuid.New(),
		ReportedUserID: &targetUserID,
		Reason:         "Salah paham",
		Status:         domain.ReportPending,
		CreatedAt:      time.Now(),
	})

	engService := service.NewEngagementService(feedbackRepo, reportRepo, groupRepo, userRepo)

	// Action 1: Admin restores user
	err := engService.ModerateUser(context.Background(), targetUserID, domain.ModerateUserRequest{
		Action: "restore",
		Note:   "Laporan diverifikasi tidak valid / salah paham",
	})
	if err != nil {
		t.Fatalf("restore failed: %v", err)
	}

	u, _ := userRepo.FindByID(context.Background(), targetUserID)
	if u.AccountStatus != domain.AccountActive {
		t.Errorf("expected user to be active after restore, got '%s'", u.AccountStatus)
	}
	if u.RestrictionNote != "" {
		t.Errorf("expected restriction note to be cleared on restore")
	}

	// Action 2: Admin suspends user
	err = engService.ModerateUser(context.Background(), targetUserID, domain.ModerateUserRequest{
		Action: "suspend",
		Note:   "Terbukti melakukan pelanggaran berat akademik",
	})
	if err != nil {
		t.Fatalf("suspend failed: %v", err)
	}

	u, _ = userRepo.FindByID(context.Background(), targetUserID)
	if u.AccountStatus != domain.AccountSuspended {
		t.Errorf("expected user to be suspended, got '%s'", u.AccountStatus)
	}

	// Associated active groups must be cancelled
	g, _ := groupRepo.FindByID(context.Background(), targetGroupID)
	if g.Status != domain.StatusCancelled {
		t.Errorf("expected hosted groups to be cancelled when user is suspended, got '%s'", g.Status)
	}
}
