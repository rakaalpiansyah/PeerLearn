package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

type FeedbackRepository interface {
	Create(ctx context.Context, f *domain.Feedback) error
	ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.Feedback, error)
	ListByReviewer(ctx context.Context, reviewerID uuid.UUID) ([]domain.Feedback, error)
	AddContributionPoints(ctx context.Context, userID uuid.UUID, points int) error
}

type feedbackRepository struct {
	pool *pgxpool.Pool
}

func NewFeedbackRepository(pool *pgxpool.Pool) FeedbackRepository {
	return &feedbackRepository{pool: pool}
}

func (r *feedbackRepository) Create(ctx context.Context, f *domain.Feedback) error {
	query := `
		INSERT INTO feedbacks (id, group_id, reviewer_id, rating, comment, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	f.CreatedAt = time.Now().UTC()

	_, err := r.pool.Exec(ctx, query, f.ID, f.GroupID, f.ReviewerID, f.Rating, f.Comment, f.CreatedAt)
	if err != nil {
		return fmt.Errorf("feedbackRepository.Create: %w", err)
	}
	return nil
}

func (r *feedbackRepository) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.Feedback, error) {
	query := `
		SELECT 
			f.id, f.group_id, f.reviewer_id, f.rating, f.comment, f.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.bio, u.avatar_url, u.contribution_points, u.created_at
		FROM feedbacks f
		JOIN users u ON f.reviewer_id = u.id
		WHERE f.group_id = $1
		ORDER BY f.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("feedbackRepository.ListByGroup: %w", err)
	}
	defer rows.Close()

	var list []domain.Feedback
	for rows.Next() {
		var f domain.Feedback
		var u domain.User
		err := rows.Scan(
			&f.ID,
			&f.GroupID,
			&f.ReviewerID,
			&f.Rating,
			&f.Comment,
			&f.CreatedAt,
			&u.ID,
			&u.Email,
			&u.FullName,
			&u.Role,
			&u.CampusName,
			&u.Bio,
			&u.AvatarURL,
			&u.ContributionPoints,
			&u.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("feedbackRepository.ListByGroup.Scan: %w", err)
		}
		f.Reviewer = &u
		list = append(list, f)
	}
	return list, nil
}

func (r *feedbackRepository) ListByReviewer(ctx context.Context, reviewerID uuid.UUID) ([]domain.Feedback, error) {
	query := `
		SELECT id, group_id, reviewer_id, rating, comment, created_at
		FROM feedbacks
		WHERE reviewer_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, reviewerID)
	if err != nil {
		return nil, fmt.Errorf("feedbackRepository.ListByReviewer: %w", err)
	}
	defer rows.Close()

	var list []domain.Feedback
	for rows.Next() {
		var f domain.Feedback
		if err := rows.Scan(&f.ID, &f.GroupID, &f.ReviewerID, &f.Rating, &f.Comment, &f.CreatedAt); err != nil {
			return nil, fmt.Errorf("feedbackRepository.ListByReviewer.Scan: %w", err)
		}
		list = append(list, f)
	}
	return list, nil
}

func (r *feedbackRepository) AddContributionPoints(ctx context.Context, userID uuid.UUID, points int) error {
	query := `
		UPDATE users
		SET contribution_points = contribution_points + $1
		WHERE id = $2
	`
	_, err := r.pool.Exec(ctx, query, points, userID)
	if err != nil {
		return fmt.Errorf("feedbackRepository.AddContributionPoints: %w", err)
	}
	return nil
}
