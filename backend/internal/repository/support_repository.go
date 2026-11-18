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

var ErrSupportThreadNotFound = errors.New("repository: support thread not found")

type SupportRepository interface {
	GetOrCreateThreadByStudent(ctx context.Context, studentID uuid.UUID, subject string) (*domain.SupportThread, error)
	GetThreadByStudent(ctx context.Context, studentID uuid.UUID) (*domain.SupportThreadResponse, error)
	GetThreadByID(ctx context.Context, threadID uuid.UUID) (*domain.SupportThreadResponse, error)
	ListThreadsForAdmin(ctx context.Context, statusFilter string) ([]domain.SupportThreadResponse, error)
	CreateMessage(ctx context.Context, msg *domain.SupportMessage, reopenThread bool) (*domain.SupportMessageResponse, error)
	ListMessagesByThread(ctx context.Context, threadID uuid.UUID) ([]domain.SupportMessageResponse, error)
	UpdateThreadStatus(ctx context.Context, threadID uuid.UUID, status domain.SupportThreadStatus) error
}

type supportRepository struct {
	pool *pgxpool.Pool
}

func NewSupportRepository(pool *pgxpool.Pool) SupportRepository {
	return &supportRepository{pool: pool}
}

func (r *supportRepository) GetOrCreateThreadByStudent(ctx context.Context, studentID uuid.UUID, subject string) (*domain.SupportThread, error) {
	if subject == "" {
		subject = "Pertanyaan & Bantuan Akademik"
	}
	now := time.Now().UTC()

	insertQuery := `
		INSERT INTO support_threads (id, student_id, subject, status, last_message_at, created_at, updated_at)
		VALUES ($1, $2, $3, 'open', $4, $4, $4)
		ON CONFLICT (student_id) DO NOTHING
	`
	_, err := r.pool.Exec(ctx, insertQuery, uuid.New(), studentID, subject, now)
	if err != nil {
		return nil, fmt.Errorf("supportRepository.GetOrCreateThreadByStudent insert: %w", err)
	}

	selectQuery := `
		SELECT id, student_id, subject, status, last_message_at, created_at, updated_at
		FROM support_threads
		WHERE student_id = $1
	`
	var thread domain.SupportThread
	err = r.pool.QueryRow(ctx, selectQuery, studentID).Scan(
		&thread.ID,
		&thread.StudentID,
		&thread.Subject,
		&thread.Status,
		&thread.LastMessageAt,
		&thread.CreatedAt,
		&thread.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("supportRepository.GetOrCreateThreadByStudent select: %w", err)
	}

	return &thread, nil
}

func (r *supportRepository) GetThreadByStudent(ctx context.Context, studentID uuid.UUID) (*domain.SupportThreadResponse, error) {
	query := `
		SELECT
			t.id, t.student_id, t.subject, t.status, t.last_message_at, t.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.avatar_url, u.account_status,
			(SELECT COUNT(*) FROM support_messages sm WHERE sm.thread_id = t.id)
		FROM support_threads t
		JOIN users u ON t.student_id = u.id
		WHERE t.student_id = $1
	`
	var resp domain.SupportThreadResponse
	var student domain.UserResponse
	err := r.pool.QueryRow(ctx, query, studentID).Scan(
		&resp.ID,
		&resp.StudentID,
		&resp.Subject,
		&resp.Status,
		&resp.LastMessageAt,
		&resp.CreatedAt,
		&student.ID,
		&student.Email,
		&student.FullName,
		&student.Role,
		&student.CampusName,
		&student.AvatarURL,
		&student.AccountStatus,
		&resp.MessageCount,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSupportThreadNotFound
		}
		return nil, fmt.Errorf("supportRepository.GetThreadByStudent: %w", err)
	}
	resp.Student = &student

	msgs, err := r.ListMessagesByThread(ctx, resp.ID)
	if err != nil {
		return nil, err
	}
	resp.Messages = msgs
	return &resp, nil
}

func (r *supportRepository) GetThreadByID(ctx context.Context, threadID uuid.UUID) (*domain.SupportThreadResponse, error) {
	query := `
		SELECT
			t.id, t.student_id, t.subject, t.status, t.last_message_at, t.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.avatar_url, u.account_status,
			(SELECT COUNT(*) FROM support_messages sm WHERE sm.thread_id = t.id)
		FROM support_threads t
		JOIN users u ON t.student_id = u.id
		WHERE t.id = $1
	`
	var resp domain.SupportThreadResponse
	var student domain.UserResponse
	err := r.pool.QueryRow(ctx, query, threadID).Scan(
		&resp.ID,
		&resp.StudentID,
		&resp.Subject,
		&resp.Status,
		&resp.LastMessageAt,
		&resp.CreatedAt,
		&student.ID,
		&student.Email,
		&student.FullName,
		&student.Role,
		&student.CampusName,
		&student.AvatarURL,
		&student.AccountStatus,
		&resp.MessageCount,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSupportThreadNotFound
		}
		return nil, fmt.Errorf("supportRepository.GetThreadByID: %w", err)
	}
	resp.Student = &student

	msgs, err := r.ListMessagesByThread(ctx, resp.ID)
	if err != nil {
		return nil, err
	}
	resp.Messages = msgs
	return &resp, nil
}

func (r *supportRepository) ListThreadsForAdmin(ctx context.Context, statusFilter string) ([]domain.SupportThreadResponse, error) {
	query := `
		SELECT
			t.id, t.student_id, t.subject, t.status, t.last_message_at, t.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.avatar_url, u.account_status,
			COALESCE(lm.message, ''),
			COALESCE(lm_sender.full_name, ''),
			COALESCE(lm_sender.role, ''),
			(SELECT COUNT(*) FROM support_messages sm WHERE sm.thread_id = t.id)
		FROM support_threads t
		JOIN users u ON t.student_id = u.id
		LEFT JOIN LATERAL (
			SELECT sm.message, sm.sender_id
			FROM support_messages sm
			WHERE sm.thread_id = t.id
			ORDER BY sm.created_at DESC
			LIMIT 1
		) lm ON true
		LEFT JOIN users lm_sender ON lm.sender_id = lm_sender.id
	`
	var args []interface{}
	if statusFilter != "" && statusFilter != "all" {
		query += " WHERE t.status = $1"
		args = append(args, statusFilter)
	}
	query += " ORDER BY CASE WHEN t.status = 'open' THEN 0 ELSE 1 END ASC, t.last_message_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("supportRepository.ListThreadsForAdmin: %w", err)
	}
	defer rows.Close()

	threads := make([]domain.SupportThreadResponse, 0)
	for rows.Next() {
		var resp domain.SupportThreadResponse
		var student domain.UserResponse
		var lastSenderRole string
		err := rows.Scan(
			&resp.ID,
			&resp.StudentID,
			&resp.Subject,
			&resp.Status,
			&resp.LastMessageAt,
			&resp.CreatedAt,
			&student.ID,
			&student.Email,
			&student.FullName,
			&student.Role,
			&student.CampusName,
			&student.AvatarURL,
			&student.AccountStatus,
			&resp.LastMessage,
			&resp.LastSender,
			&lastSenderRole,
			&resp.MessageCount,
		)
		if err != nil {
			return nil, fmt.Errorf("supportRepository.ListThreadsForAdmin.Scan: %w", err)
		}
		resp.LastSenderRole = domain.UserRole(lastSenderRole)
		resp.Student = &student
		threads = append(threads, resp)
	}

	return threads, nil
}

func (r *supportRepository) CreateMessage(ctx context.Context, msg *domain.SupportMessage, reopenThread bool) (*domain.SupportMessageResponse, error) {
	if msg.ID == uuid.Nil {
		msg.ID = uuid.New()
	}
	msg.CreatedAt = time.Now().UTC()

	insertQuery := `
		INSERT INTO support_messages (id, thread_id, sender_id, message, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	if _, err := r.pool.Exec(ctx, insertQuery, msg.ID, msg.ThreadID, msg.SenderID, msg.Message, msg.CreatedAt); err != nil {
		return nil, fmt.Errorf("supportRepository.CreateMessage insert: %w", err)
	}

	if reopenThread {
		_, err := r.pool.Exec(ctx, `
			UPDATE support_threads
			SET status = 'open', last_message_at = $1, updated_at = $1
			WHERE id = $2
		`, msg.CreatedAt, msg.ThreadID)
		if err != nil {
			return nil, fmt.Errorf("supportRepository.CreateMessage updateThread reopen: %w", err)
		}
	} else {
		_, err := r.pool.Exec(ctx, `
			UPDATE support_threads
			SET last_message_at = $1, updated_at = $1
			WHERE id = $2
		`, msg.CreatedAt, msg.ThreadID)
		if err != nil {
			return nil, fmt.Errorf("supportRepository.CreateMessage updateThread: %w", err)
		}
	}

	var resp domain.SupportMessageResponse
	var sender domain.UserResponse
	selectQuery := `
		SELECT
			sm.id, sm.thread_id, sm.sender_id, sm.message, sm.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.avatar_url
		FROM support_messages sm
		JOIN users u ON sm.sender_id = u.id
		WHERE sm.id = $1
	`
	err := r.pool.QueryRow(ctx, selectQuery, msg.ID).Scan(
		&resp.ID,
		&resp.ThreadID,
		&resp.SenderID,
		&resp.Message,
		&resp.CreatedAt,
		&sender.ID,
		&sender.Email,
		&sender.FullName,
		&sender.Role,
		&sender.CampusName,
		&sender.AvatarURL,
	)
	if err != nil {
		return nil, fmt.Errorf("supportRepository.CreateMessage select: %w", err)
	}
	resp.Sender = &sender
	return &resp, nil
}

func (r *supportRepository) ListMessagesByThread(ctx context.Context, threadID uuid.UUID) ([]domain.SupportMessageResponse, error) {
	query := `
		SELECT
			sm.id, sm.thread_id, sm.sender_id, sm.message, sm.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.avatar_url
		FROM support_messages sm
		JOIN users u ON sm.sender_id = u.id
		WHERE sm.thread_id = $1
		ORDER BY sm.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, threadID)
	if err != nil {
		return nil, fmt.Errorf("supportRepository.ListMessagesByThread: %w", err)
	}
	defer rows.Close()

	messages := make([]domain.SupportMessageResponse, 0)
	for rows.Next() {
		var resp domain.SupportMessageResponse
		var sender domain.UserResponse
		err := rows.Scan(
			&resp.ID,
			&resp.ThreadID,
			&resp.SenderID,
			&resp.Message,
			&resp.CreatedAt,
			&sender.ID,
			&sender.Email,
			&sender.FullName,
			&sender.Role,
			&sender.CampusName,
			&sender.AvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("supportRepository.ListMessagesByThread.Scan: %w", err)
		}
		resp.Sender = &sender
		messages = append(messages, resp)
	}

	return messages, nil
}

func (r *supportRepository) UpdateThreadStatus(ctx context.Context, threadID uuid.UUID, status domain.SupportThreadStatus) error {
	query := `
		UPDATE support_threads
		SET status = $1, updated_at = $2
		WHERE id = $3
	`
	cmd, err := r.pool.Exec(ctx, query, status, time.Now().UTC(), threadID)
	if err != nil {
		return fmt.Errorf("supportRepository.UpdateThreadStatus: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrSupportThreadNotFound
	}
	return nil
}
