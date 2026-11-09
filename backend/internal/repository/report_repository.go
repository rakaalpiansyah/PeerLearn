package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

type ReportRepository interface {
	Create(ctx context.Context, r *domain.Report) error
	ListAll(ctx context.Context) ([]domain.Report, error)
	ListWithDetails(ctx context.Context) ([]domain.ModerationReportItem, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ReportStatus) error
	CountUniqueReportersLast7Days(ctx context.Context, reportedUserID uuid.UUID) (int, error)
	HasPendingReport(ctx context.Context, reporterID uuid.UUID, targetGroupID, reportedUserID *uuid.UUID) (bool, error)
	ResolveUserReports(ctx context.Context, reportedUserID uuid.UUID) error
}

type reportRepository struct {
	pool *pgxpool.Pool
}

func NewReportRepository(pool *pgxpool.Pool) ReportRepository {
	return &reportRepository{pool: pool}
}

func (r *reportRepository) Create(ctx context.Context, rep *domain.Report) error {
	query := `
		INSERT INTO reports (id, reporter_id, reported_user_id, target_group_id, reason, details, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	if rep.ID == uuid.Nil {
		rep.ID = uuid.New()
	}
	rep.CreatedAt = time.Now().UTC()
	if rep.Status == "" {
		rep.Status = domain.ReportPending
	}

	_, err := r.pool.Exec(ctx, query,
		rep.ID,
		rep.ReporterID,
		rep.ReportedUserID,
		rep.TargetGroupID,
		rep.Reason,
		rep.Details,
		rep.Status,
		rep.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("reportRepository.Create: %w", err)
	}
	return nil
}

func (r *reportRepository) ListAll(ctx context.Context) ([]domain.Report, error) {
	query := `
		SELECT id, reporter_id, reported_user_id, target_group_id, reason, details, status, created_at
		FROM reports
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("reportRepository.ListAll: %w", err)
	}
	defer rows.Close()

	var list []domain.Report
	for rows.Next() {
		var rep domain.Report
		err := rows.Scan(
			&rep.ID,
			&rep.ReporterID,
			&rep.ReportedUserID,
			&rep.TargetGroupID,
			&rep.Reason,
			&rep.Details,
			&rep.Status,
			&rep.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("reportRepository.ListAll.Scan: %w", err)
		}
		list = append(list, rep)
	}
	return list, nil
}

func (r *reportRepository) ListWithDetails(ctx context.Context) ([]domain.ModerationReportItem, error) {
	query := `
		SELECT 
			r.id, r.reporter_id, r.reported_user_id, r.target_group_id, r.reason, r.details, r.status, r.created_at,
			u_rep.id, u_rep.full_name, u_rep.email, u_rep.role, u_rep.campus_name, u_rep.avatar_url,
			u_tar.id, u_tar.full_name, u_tar.email, u_tar.role, u_tar.campus_name, u_tar.avatar_url, u_tar.account_status,
			g.id, g.title, g.status,
			(
				SELECT COUNT(DISTINCT r2.reporter_id)
				FROM reports r2
				WHERE r2.reported_user_id = r.reported_user_id
				  AND r2.created_at >= NOW() - INTERVAL '7 days'
			) as weekly_reports_count
		FROM reports r
		LEFT JOIN users u_rep ON r.reporter_id = u_rep.id
		LEFT JOIN users u_tar ON r.reported_user_id = u_tar.id
		LEFT JOIN learning_groups g ON r.target_group_id = g.id
		ORDER BY r.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("reportRepository.ListWithDetails: %w", err)
	}
	defer rows.Close()

	items := make([]domain.ModerationReportItem, 0)
	for rows.Next() {
		var rep domain.Report
		var repUser domain.UserResponse
		var tarUser domain.UserResponse
		var group domain.GroupResponse
		var weeklyCount int

		var repID, tarID, gID *uuid.UUID
		var repName, repEmail, repRole, repCampus, repAvatar *string
		var tarName, tarEmail, tarRole, tarCampus, tarAvatar, tarStatus *string
		var gTitle, gStatus *string

		err := rows.Scan(
			&rep.ID, &rep.ReporterID, &rep.ReportedUserID, &rep.TargetGroupID, &rep.Reason, &rep.Details, &rep.Status, &rep.CreatedAt,
			&repID, &repName, &repEmail, &repRole, &repCampus, &repAvatar,
			&tarID, &tarName, &tarEmail, &tarRole, &tarCampus, &tarAvatar, &tarStatus,
			&gID, &gTitle, &gStatus,
			&weeklyCount,
		)
		if err != nil {
			return nil, fmt.Errorf("reportRepository.ListWithDetails.Scan: %w", err)
		}

		item := domain.ModerationReportItem{
			Report:             rep,
			WeeklyReportsCount: weeklyCount,
		}

		if repID != nil && repName != nil {
			repUser.ID = *repID
			repUser.FullName = *repName
			if repEmail != nil {
				repUser.Email = *repEmail
			}
			if repRole != nil {
				repUser.Role = domain.UserRole(*repRole)
			}
			if repCampus != nil {
				repUser.CampusName = *repCampus
			}
			if repAvatar != nil {
				repUser.AvatarURL = *repAvatar
			}
			item.Reporter = &repUser
		}

		if tarID != nil && tarName != nil {
			tarUser.ID = *tarID
			tarUser.FullName = *tarName
			if tarEmail != nil {
				tarUser.Email = *tarEmail
			}
			if tarRole != nil {
				tarUser.Role = domain.UserRole(*tarRole)
			}
			if tarCampus != nil {
				tarUser.CampusName = *tarCampus
			}
			if tarAvatar != nil {
				tarUser.AvatarURL = *tarAvatar
			}
			if tarStatus != nil {
				tarUser.AccountStatus = domain.AccountStatus(*tarStatus)
			}
			item.ReportedUser = &tarUser
		}

		if gID != nil && gTitle != nil {
			group.ID = *gID
			group.Title = *gTitle
			if gStatus != nil {
				group.Status = domain.GroupStatus(*gStatus)
			}
			item.TargetGroup = &group
		}

		items = append(items, item)
	}
	return items, nil
}

func (r *reportRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ReportStatus) error {
	query := `
		UPDATE reports
		SET status = $1
		WHERE id = $2
	`
	_, err := r.pool.Exec(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("reportRepository.UpdateStatus: %w", err)
	}
	return nil
}

func (r *reportRepository) CountUniqueReportersLast7Days(ctx context.Context, reportedUserID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(DISTINCT reporter_id)
		FROM reports
		WHERE reported_user_id = $1
		  AND created_at >= NOW() - INTERVAL '7 days'
	`
	var count int
	err := r.pool.QueryRow(ctx, query, reportedUserID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("reportRepository.CountUniqueReportersLast7Days: %w", err)
	}
	return count, nil
}

func (r *reportRepository) HasPendingReport(ctx context.Context, reporterID uuid.UUID, targetGroupID, reportedUserID *uuid.UUID) (bool, error) {
	query := `
		SELECT 1
		FROM reports
		WHERE reporter_id = $1
		  AND status = 'pending'
		  AND (
			($2::uuid IS NOT NULL AND target_group_id = $2)
			OR
			($3::uuid IS NOT NULL AND reported_user_id = $3)
		  )
		LIMIT 1
	`
	var exists int
	err := r.pool.QueryRow(ctx, query, reporterID, targetGroupID, reportedUserID).Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("reportRepository.HasPendingReport: %w", err)
	}
	return true, nil
}

func (r *reportRepository) ResolveUserReports(ctx context.Context, reportedUserID uuid.UUID) error {
	query := `
		UPDATE reports
		SET status = 'resolved'
		WHERE reported_user_id = $1
		  AND status = 'pending'
	`
	_, err := r.pool.Exec(ctx, query, reportedUserID)
	if err != nil {
		return fmt.Errorf("reportRepository.ResolveUserReports: %w", err)
	}
	return nil
}
