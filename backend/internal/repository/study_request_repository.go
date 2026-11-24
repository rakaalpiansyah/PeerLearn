package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

var ErrStudyRequestNotFound = errors.New("repository: study request not found")

type StudyRequestRepository interface {
	Create(ctx context.Context, req *domain.StudyRequest) error
	List(ctx context.Context, filter domain.StudyRequestFilter, viewerID *uuid.UUID) ([]domain.StudyRequestResponse, error)
	FindByID(ctx context.Context, id uuid.UUID, viewerID *uuid.UUID) (*domain.StudyRequestResponse, error)
	ToggleVote(ctx context.Context, requestID, userID uuid.UUID) (bool, int, error)
	ListVoterIDs(ctx context.Context, requestID uuid.UUID) ([]uuid.UUID, error)
	MarkFulfilled(ctx context.Context, requestID, groupID uuid.UUID) error
}

type studyRequestRepository struct {
	pool *pgxpool.Pool
}

func NewStudyRequestRepository(pool *pgxpool.Pool) StudyRequestRepository {
	return &studyRequestRepository{pool: pool}
}

func (r *studyRequestRepository) Create(ctx context.Context, req *domain.StudyRequest) error {
	if req.ID == uuid.Nil {
		req.ID = uuid.New()
	}
	now := time.Now().UTC()
	req.CreatedAt = now
	req.UpdatedAt = now
	if req.Status == "" {
		req.Status = domain.StudyRequestOpen
	}
	if req.PreferredFormat == "" {
		req.PreferredFormat = domain.FormatOnline
	}
	if req.Category == "" {
		req.Category = "Teknologi"
	}

	query := `
		INSERT INTO study_requests (id, requester_id, title, description, category, preferred_format, status, fulfilled_group_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	if _, err := r.pool.Exec(ctx, query,
		req.ID, req.RequesterID, req.Title, req.Description, req.Category, req.PreferredFormat,
		req.Status, req.FulfilledGroupID, req.CreatedAt, req.UpdatedAt,
	); err != nil {
		return fmt.Errorf("studyRequestRepository.Create: %w", err)
	}
	return nil
}

func (r *studyRequestRepository) List(ctx context.Context, filter domain.StudyRequestFilter, viewerID *uuid.UUID) ([]domain.StudyRequestResponse, error) {
	var sb strings.Builder
	var args []interface{}
	argIdx := 1

	sb.WriteString(`
		SELECT
			sr.id, sr.requester_id, sr.title, sr.description, sr.category, sr.preferred_format,
			sr.status, sr.fulfilled_group_id, sr.created_at,
			(SELECT COUNT(*) FROM study_request_votes v WHERE v.request_id = sr.id) AS vote_count
	`)
	if viewerID != nil && *viewerID != uuid.Nil {
		sb.WriteString(fmt.Sprintf(`, EXISTS(SELECT 1 FROM study_request_votes v2 WHERE v2.request_id = sr.id AND v2.user_id = $%d) AS user_voted`, argIdx))
		args = append(args, *viewerID)
		argIdx++
	} else {
		sb.WriteString(`, FALSE AS user_voted`)
	}

	sb.WriteString(`,
			u.id, u.full_name, u.role, u.campus_name, u.avatar_url, u.contribution_points, u.created_at
		FROM study_requests sr
		JOIN users u ON sr.requester_id = u.id
		WHERE 1=1
	`)

	if filter.Status != "" {
		sb.WriteString(fmt.Sprintf(" AND sr.status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.Category != "" && filter.Category != "Semua" {
		sb.WriteString(fmt.Sprintf(" AND sr.category = $%d", argIdx))
		args = append(args, filter.Category)
		argIdx++
	}
	if strings.TrimSpace(filter.Search) != "" {
		sb.WriteString(fmt.Sprintf(" AND (LOWER(sr.title) LIKE $%d OR LOWER(sr.description) LIKE $%d OR LOWER(u.full_name) LIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+strings.ToLower(strings.TrimSpace(filter.Search))+"%")
		argIdx++
	}

	sb.WriteString(`
		ORDER BY
			CASE WHEN sr.status = 'open' THEN 0 WHEN sr.status = 'fulfilled' THEN 1 ELSE 2 END ASC,
			vote_count DESC,
			sr.created_at DESC
	`)

	rows, err := r.pool.Query(ctx, sb.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("studyRequestRepository.List: %w", err)
	}
	defer rows.Close()

	list := make([]domain.StudyRequestResponse, 0)
	for rows.Next() {
		var item domain.StudyRequestResponse
		var requester domain.UserResponse
		if err := rows.Scan(
			&item.ID, &item.RequesterID, &item.Title, &item.Description, &item.Category, &item.PreferredFormat,
			&item.Status, &item.FulfilledGroupID, &item.CreatedAt, &item.VoteCount, &item.UserVoted,
			&requester.ID, &requester.FullName, &requester.Role, &requester.CampusName, &requester.AvatarURL, &requester.ContributionPoints, &requester.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("studyRequestRepository.List.Scan: %w", err)
		}
		item.Requester = &requester
		list = append(list, item)
	}
	return list, nil
}

func (r *studyRequestRepository) FindByID(ctx context.Context, id uuid.UUID, viewerID *uuid.UUID) (*domain.StudyRequestResponse, error) {
	var args []interface{}
	args = append(args, id)
	userVotedExpr := "FALSE AS user_voted"
	if viewerID != nil && *viewerID != uuid.Nil {
		args = append(args, *viewerID)
		userVotedExpr = "EXISTS(SELECT 1 FROM study_request_votes v2 WHERE v2.request_id = sr.id AND v2.user_id = $2) AS user_voted"
	}

	query := fmt.Sprintf(`
		SELECT
			sr.id, sr.requester_id, sr.title, sr.description, sr.category, sr.preferred_format,
			sr.status, sr.fulfilled_group_id, sr.created_at,
			(SELECT COUNT(*) FROM study_request_votes v WHERE v.request_id = sr.id) AS vote_count,
			%s,
			u.id, u.full_name, u.role, u.campus_name, u.avatar_url, u.contribution_points, u.created_at
		FROM study_requests sr
		JOIN users u ON sr.requester_id = u.id
		WHERE sr.id = $1
	`, userVotedExpr)

	var item domain.StudyRequestResponse
	var requester domain.UserResponse
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&item.ID, &item.RequesterID, &item.Title, &item.Description, &item.Category, &item.PreferredFormat,
		&item.Status, &item.FulfilledGroupID, &item.CreatedAt, &item.VoteCount, &item.UserVoted,
		&requester.ID, &requester.FullName, &requester.Role, &requester.CampusName, &requester.AvatarURL, &requester.ContributionPoints, &requester.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrStudyRequestNotFound
		}
		return nil, fmt.Errorf("studyRequestRepository.FindByID: %w", err)
	}
	item.Requester = &requester
	return &item, nil
}

func (r *studyRequestRepository) ToggleVote(ctx context.Context, requestID, userID uuid.UUID) (bool, int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, 0, fmt.Errorf("studyRequestRepository.ToggleVote.Begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM study_request_votes WHERE request_id = $1 AND user_id = $2)`, requestID, userID).Scan(&exists); err != nil {
		return false, 0, fmt.Errorf("studyRequestRepository.ToggleVote.Check: %w", err)
	}

	var voted bool
	if exists {
		if _, err := tx.Exec(ctx, `DELETE FROM study_request_votes WHERE request_id = $1 AND user_id = $2`, requestID, userID); err != nil {
			return false, 0, fmt.Errorf("studyRequestRepository.ToggleVote.Delete: %w", err)
		}
		voted = false
	} else {
		if _, err := tx.Exec(ctx, `INSERT INTO study_request_votes (request_id, user_id, created_at) VALUES ($1, $2, $3)`, requestID, userID, time.Now().UTC()); err != nil {
			return false, 0, fmt.Errorf("studyRequestRepository.ToggleVote.Insert: %w", err)
		}
		voted = true
	}

	var count int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM study_request_votes WHERE request_id = $1`, requestID).Scan(&count); err != nil {
		return false, 0, fmt.Errorf("studyRequestRepository.ToggleVote.Count: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return false, 0, fmt.Errorf("studyRequestRepository.ToggleVote.Commit: %w", err)
	}
	return voted, count, nil
}

func (r *studyRequestRepository) ListVoterIDs(ctx context.Context, requestID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `SELECT user_id FROM study_request_votes WHERE request_id = $1`, requestID)
	if err != nil {
		return nil, fmt.Errorf("studyRequestRepository.ListVoterIDs: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var uid uuid.UUID
		if err := rows.Scan(&uid); err != nil {
			return nil, fmt.Errorf("studyRequestRepository.ListVoterIDs.Scan: %w", err)
		}
		ids = append(ids, uid)
	}
	return ids, nil
}

func (r *studyRequestRepository) MarkFulfilled(ctx context.Context, requestID, groupID uuid.UUID) error {
	cmd, err := r.pool.Exec(ctx, `
		UPDATE study_requests
		SET status = 'fulfilled', fulfilled_group_id = $1, updated_at = $2
		WHERE id = $3
	`, groupID, time.Now().UTC(), requestID)
	if err != nil {
		return fmt.Errorf("studyRequestRepository.MarkFulfilled: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrStudyRequestNotFound
	}
	return nil
}
