package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

type EngagementService interface {
	CreateFeedback(ctx context.Context, reviewerID, groupID uuid.UUID, req domain.CreateFeedbackRequest) (*domain.Feedback, error)
	GetGroupFeedbacks(ctx context.Context, groupID uuid.UUID) ([]domain.Feedback, error)
	CreateReport(ctx context.Context, reporterID uuid.UUID, req domain.CreateReportRequest) (*domain.Report, error)
	ListReports(ctx context.Context) ([]domain.Report, error)
	ListModerationItems(ctx context.Context) ([]domain.ModerationReportItem, error)
	ResolveReport(ctx context.Context, reportID uuid.UUID, status domain.ReportStatus) error
	ModerateUser(ctx context.Context, targetUserID uuid.UUID, req domain.ModerateUserRequest) error
}

type engagementService struct {
	feedbackRepo repository.FeedbackRepository
	reportRepo   repository.ReportRepository
	groupRepo    repository.GroupRepository
	userRepo     repository.UserRepository
}

func NewEngagementService(
	feedbackRepo repository.FeedbackRepository,
	reportRepo repository.ReportRepository,
	groupRepo repository.GroupRepository,
	userRepo repository.UserRepository,
) EngagementService {
	return &engagementService{
		feedbackRepo: feedbackRepo,
		reportRepo:   reportRepo,
		groupRepo:    groupRepo,
		userRepo:     userRepo,
	}
}

func (s *engagementService) CreateFeedback(ctx context.Context, reviewerID, groupID uuid.UUID, req domain.CreateFeedbackRequest) (*domain.Feedback, error) {
	if req.Rating < 1 || req.Rating > 5 {
		return nil, fmt.Errorf("%w: rating harus bernilai antara 1 sampai 5", ErrInvalidInput)
	}

	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("engagementService.CreateFeedback group: %w", err)
	}

	fb := &domain.Feedback{
		ID:         uuid.New(),
		GroupID:    groupID,
		ReviewerID: reviewerID,
		Rating:     req.Rating,
		Comment:    strings.TrimSpace(req.Comment),
	}

	if err := s.feedbackRepo.Create(ctx, fb); err != nil {
		return nil, fmt.Errorf("engagementService.CreateFeedback: %w", err)
	}

	// Add contribution points: +5 to host, +2 to reviewer for constructive participation
	_ = s.feedbackRepo.AddContributionPoints(ctx, group.HostID, 5)
	_ = s.feedbackRepo.AddContributionPoints(ctx, reviewerID, 2)

	return fb, nil
}

func (s *engagementService) GetGroupFeedbacks(ctx context.Context, groupID uuid.UUID) ([]domain.Feedback, error) {
	return s.feedbackRepo.ListByGroup(ctx, groupID)
}

func (s *engagementService) CreateReport(ctx context.Context, reporterID uuid.UUID, req domain.CreateReportRequest) (*domain.Report, error) {
	req.Reason = strings.TrimSpace(req.Reason)
	if req.Reason == "" {
		return nil, fmt.Errorf("%w: alasan laporan wajib diisi", ErrInvalidInput)
	}

	// If reporting a group and reported_user_id is omitted, link to group host
	reportedUserID := req.ReportedUserID
	if reportedUserID == nil && req.TargetGroupID != nil {
		group, err := s.groupRepo.FindByID(ctx, *req.TargetGroupID)
		if err == nil && group != nil {
			reportedUserID = &group.HostID
		}
	}

	// Prevent spam duplicate reports from same reporter while pending
	hasPending, err := s.reportRepo.HasPendingReport(ctx, reporterID, req.TargetGroupID, reportedUserID)
	if err == nil && hasPending {
		return nil, fmt.Errorf("%w: Anda telah melaporkan hal ini sebelumnya dan sedang dalam peninjauan", ErrInvalidInput)
	}

	rep := &domain.Report{
		ID:             uuid.New(),
		ReporterID:     reporterID,
		ReportedUserID: reportedUserID,
		TargetGroupID:  req.TargetGroupID,
		Reason:         req.Reason,
		Details:        strings.TrimSpace(req.Details),
		Status:         domain.ReportPending,
	}

	if err := s.reportRepo.Create(ctx, rep); err != nil {
		return nil, fmt.Errorf("engagementService.CreateReport: %w", err)
	}

	// Auto-restrict check: 3 unique reporters within last 7 days
	if reportedUserID != nil && s.userRepo != nil {
		uniqueReporters, err := s.reportRepo.CountUniqueReportersLast7Days(ctx, *reportedUserID)
		if err == nil && uniqueReporters >= 3 {
			_ = s.userRepo.UpdateAccountStatus(
				ctx,
				*reportedUserID,
				domain.AccountRestricted,
				"Dibatasi otomatis sementara karena menerima 3 laporan atau lebih dalam 7 hari terakhir. Menunggu peninjauan admin.",
			)
		}
	}

	return rep, nil
}

func (s *engagementService) ListReports(ctx context.Context) ([]domain.Report, error) {
	return s.reportRepo.ListAll(ctx)
}

func (s *engagementService) ListModerationItems(ctx context.Context) ([]domain.ModerationReportItem, error) {
	return s.reportRepo.ListWithDetails(ctx)
}

func (s *engagementService) ResolveReport(ctx context.Context, reportID uuid.UUID, status domain.ReportStatus) error {
	return s.reportRepo.UpdateStatus(ctx, reportID, status)
}

func (s *engagementService) ModerateUser(ctx context.Context, targetUserID uuid.UUID, req domain.ModerateUserRequest) error {
	if s.userRepo == nil {
		return fmt.Errorf("user repository is not configured")
	}

	switch req.Action {
	case "restore":
		if err := s.userRepo.UpdateAccountStatus(ctx, targetUserID, domain.AccountActive, ""); err != nil {
			return fmt.Errorf("engagementService.ModerateUser restore: %w", err)
		}
		_ = s.reportRepo.ResolveUserReports(ctx, targetUserID)
		return nil

	case "suspend":
		note := strings.TrimSpace(req.Note)
		if note == "" {
			note = "Akun ditangguhkan oleh tim administrator karena pelanggaran kebijakan komunitas FST."
		}
		if err := s.userRepo.UpdateAccountStatus(ctx, targetUserID, domain.AccountSuspended, note); err != nil {
			return fmt.Errorf("engagementService.ModerateUser suspend: %w", err)
		}
		if s.groupRepo != nil {
			_ = s.groupRepo.CancelByHost(ctx, targetUserID)
		}
		_ = s.reportRepo.ResolveUserReports(ctx, targetUserID)
		return nil

	default:
		return fmt.Errorf("%w: aksi moderasi tidak valid (harus 'restore' atau 'suspend')", ErrInvalidInput)
	}
}
