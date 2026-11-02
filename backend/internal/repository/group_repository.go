package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

var ErrGroupNotFound = errors.New("repository: learning group not found")

type GroupRepository interface {
	Create(ctx context.Context, group *domain.LearningGroup) error
	FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupResponse, error)
	List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error)
	Update(ctx context.Context, group *domain.LearningGroup) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.GroupStatus) error
	ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error)
	FindRecommendations(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error)
	CancelByHost(ctx context.Context, hostID uuid.UUID) error
}

type groupRepository struct {
	pool *pgxpool.Pool
}

func NewGroupRepository(pool *pgxpool.Pool) GroupRepository {
	return &groupRepository{pool: pool}
}

func (r *groupRepository) Create(ctx context.Context, g *domain.LearningGroup) error {
	agendaBytes, _ := json.Marshal(g.Agenda)
	if g.Agenda == nil {
		agendaBytes = []byte("[]")
	}

	query := `
		INSERT INTO learning_groups (
			id, host_id, title, description, category, format,
			location_or_link, latitude, longitude, building_details, agenda, prerequisites,
			start_time, end_time, max_capacity, status, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	now := time.Now().UTC()
	g.CreatedAt = now
	g.UpdatedAt = now
	if g.Status == "" {
		g.Status = domain.StatusOpen
	}

	_, err := r.pool.Exec(ctx, query,
		g.ID,
		g.HostID,
		g.Title,
		g.Description,
		g.Category,
		g.Format,
		g.LocationOrLink,
		g.Latitude,
		g.Longitude,
		g.BuildingDetails,
		agendaBytes,
		g.Prerequisites,
		g.StartTime,
		g.EndTime,
		g.MaxCapacity,
		g.Status,
		g.CreatedAt,
		g.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("groupRepository.Create: %w", err)
	}
	return nil
}

func (r *groupRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupResponse, error) {
	query := `
		SELECT 
			g.id, g.host_id, g.title, g.description, g.category, g.format,
			g.location_or_link, g.latitude, g.longitude, g.building_details, g.agenda, g.prerequisites,
			g.start_time, g.end_time, g.max_capacity, g.status, g.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.bio, u.avatar_url, u.contribution_points, u.created_at,
			(SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id AND m.status = 'accepted') as member_count
		FROM learning_groups g
		JOIN users u ON g.host_id = u.id
		WHERE g.id = $1
	`
	var resp domain.GroupResponse
	var host domain.UserResponse
	var agendaBytes []byte

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&resp.ID,
		&resp.HostID,
		&resp.Title,
		&resp.Description,
		&resp.Category,
		&resp.Format,
		&resp.LocationOrLink,
		&resp.Latitude,
		&resp.Longitude,
		&resp.BuildingDetails,
		&agendaBytes,
		&resp.Prerequisites,
		&resp.StartTime,
		&resp.EndTime,
		&resp.MaxCapacity,
		&resp.Status,
		&resp.CreatedAt,
		&host.ID,
		&host.Email,
		&host.FullName,
		&host.Role,
		&host.CampusName,
		&host.Bio,
		&host.AvatarURL,
		&host.ContributionPoints,
		&host.CreatedAt,
		&resp.CurrentMembers,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrGroupNotFound
		}
		return nil, fmt.Errorf("groupRepository.FindByID: %w", err)
	}

	if len(agendaBytes) > 0 {
		_ = json.Unmarshal(agendaBytes, &resp.Agenda)
	}
	if resp.Agenda == nil {
		resp.Agenda = []string{}
	}

	resp.Host = &host
	return &resp, nil
}

func (r *groupRepository) List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error) {
	var sb strings.Builder
	var args []interface{}
	argIdx := 1

	sb.WriteString(`
		SELECT 
			g.id, g.host_id, g.title, g.description, g.category, g.format,
			g.location_or_link, g.latitude, g.longitude, g.building_details, g.agenda, g.prerequisites,
			g.start_time, g.end_time, g.max_capacity, g.status, g.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.bio, u.avatar_url, u.contribution_points, u.created_at,
			(SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id AND m.status = 'accepted') as member_count
	`)

	if currentUserID != nil {
		sb.WriteString(fmt.Sprintf(`,
			(SELECT m.status FROM memberships m WHERE m.group_id = g.id AND m.user_id = $%d) as user_membership
		`, argIdx))
		args = append(args, *currentUserID)
		argIdx++
	} else {
		sb.WriteString(`, NULL as user_membership `)
	}

	sb.WriteString(`
		FROM learning_groups g
		JOIN users u ON g.host_id = u.id
		WHERE 1=1
	`)

	if filter.Category != "" && filter.Category != "Semua" {
		sb.WriteString(fmt.Sprintf(" AND g.category = $%d", argIdx))
		args = append(args, filter.Category)
		argIdx++
	}

	if filter.Format != "" && filter.Format != "all" {
		sb.WriteString(fmt.Sprintf(" AND g.format = $%d", argIdx))
		args = append(args, filter.Format)
		argIdx++
	}

	if filter.Status != "" {
		sb.WriteString(fmt.Sprintf(" AND g.status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.Search != "" {
		sb.WriteString(fmt.Sprintf(" AND (LOWER(g.title) LIKE $%d OR LOWER(g.description) LIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
		argIdx++
	}

	sb.WriteString(" ORDER BY g.start_time ASC")

	rows, err := r.pool.Query(ctx, sb.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("groupRepository.List: %w", err)
	}
	defer rows.Close()

	var groups []domain.GroupResponse
	for rows.Next() {
		var resp domain.GroupResponse
		var host domain.UserResponse
		var userMembership *domain.MembershipStatus
		var agendaBytes []byte

		err := rows.Scan(
			&resp.ID,
			&resp.HostID,
			&resp.Title,
			&resp.Description,
			&resp.Category,
			&resp.Format,
			&resp.LocationOrLink,
			&resp.Latitude,
			&resp.Longitude,
			&resp.BuildingDetails,
			&agendaBytes,
			&resp.Prerequisites,
			&resp.StartTime,
			&resp.EndTime,
			&resp.MaxCapacity,
			&resp.Status,
			&resp.CreatedAt,
			&host.ID,
			&host.Email,
			&host.FullName,
			&host.Role,
			&host.CampusName,
			&host.Bio,
			&host.AvatarURL,
			&host.ContributionPoints,
			&host.CreatedAt,
			&resp.CurrentMembers,
			&userMembership,
		)
		if err != nil {
			return nil, fmt.Errorf("groupRepository.List.Scan: %w", err)
		}

		if len(agendaBytes) > 0 {
			_ = json.Unmarshal(agendaBytes, &resp.Agenda)
		}
		if resp.Agenda == nil {
			resp.Agenda = []string{}
		}

		resp.Host = &host
		resp.UserMembership = userMembership
		groups = append(groups, resp)
	}

	return groups, nil
}

func (r *groupRepository) Update(ctx context.Context, g *domain.LearningGroup) error {
	agendaBytes, _ := json.Marshal(g.Agenda)
	if g.Agenda == nil {
		agendaBytes = []byte("[]")
	}

	query := `
		UPDATE learning_groups
		SET title = $1, description = $2, category = $3, format = $4,
		    location_or_link = $5, latitude = $6, longitude = $7, building_details = $8,
		    agenda = $9, prerequisites = $10, start_time = $11, end_time = $12, max_capacity = $13, updated_at = $14
		WHERE id = $15 AND host_id = $16
	`
	g.UpdatedAt = time.Now().UTC()
	cmd, err := r.pool.Exec(ctx, query,
		g.Title,
		g.Description,
		g.Category,
		g.Format,
		g.LocationOrLink,
		g.Latitude,
		g.Longitude,
		g.BuildingDetails,
		agendaBytes,
		g.Prerequisites,
		g.StartTime,
		g.EndTime,
		g.MaxCapacity,
		g.UpdatedAt,
		g.ID,
		g.HostID,
	)

	if err != nil {
		return fmt.Errorf("groupRepository.Update: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrGroupNotFound
	}
	return nil
}

func (r *groupRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.GroupStatus) error {
	query := `
		UPDATE learning_groups
		SET status = $1, updated_at = $2
		WHERE id = $3
	`
	cmd, err := r.pool.Exec(ctx, query, status, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("groupRepository.UpdateStatus: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrGroupNotFound
	}
	return nil
}

func (r *groupRepository) ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error) {
	query := `
		SELECT 
			g.id, g.host_id, g.title, g.description, g.category, g.format,
			g.location_or_link, g.start_time, g.end_time, g.max_capacity, g.status, g.created_at,
			(SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id AND m.status = 'accepted') as member_count
		FROM learning_groups g
		WHERE g.host_id = $1
		ORDER BY g.start_time DESC
	`
	rows, err := r.pool.Query(ctx, query, hostID)
	if err != nil {
		return nil, fmt.Errorf("groupRepository.ListByHost: %w", err)
	}
	defer rows.Close()

	var groups []domain.GroupResponse
	for rows.Next() {
		var g domain.GroupResponse
		err := rows.Scan(
			&g.ID,
			&g.HostID,
			&g.Title,
			&g.Description,
			&g.Category,
			&g.Format,
			&g.LocationOrLink,
			&g.StartTime,
			&g.EndTime,
			&g.MaxCapacity,
			&g.Status,
			&g.CreatedAt,
			&g.CurrentMembers,
		)
		if err != nil {
			return nil, fmt.Errorf("groupRepository.ListByHost.Scan: %w", err)
		}
		groups = append(groups, g)
	}

	return groups, nil
}

func (r *groupRepository) FindRecommendations(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error) {
	query := `
		SELECT 
			g.id, g.host_id, g.title, g.description, g.category, g.format,
			g.location_or_link, g.latitude, g.longitude, g.building_details, g.agenda, g.prerequisites,
			g.start_time, g.end_time, g.max_capacity, g.status, g.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.bio, u.avatar_url, u.contribution_points, u.created_at,
			(SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id AND m.status = 'accepted') as member_count,
			COALESCE(
				(SELECT s.name 
				 FROM user_skills us_host 
				 JOIN skills s ON us_host.skill_id = s.id 
				 WHERE us_host.user_id = g.host_id 
				   AND us_host.skill_type = 'mastered' 
				   AND us_host.skill_id IN (
				       SELECT us_user.skill_id FROM user_skills us_user 
				       WHERE us_user.user_id = $1 AND us_user.skill_type = 'learning'
				   )
				 LIMIT 1),
				g.category
			) as match_reason
		FROM learning_groups g
		JOIN users u ON g.host_id = u.id
		WHERE g.status = 'open'
		  AND g.end_time > NOW()
		  AND g.host_id != $1
		  AND (
		      EXISTS (
		          SELECT 1 FROM user_skills us_host
		          JOIN user_skills us_user ON us_host.skill_id = us_user.skill_id
		          WHERE us_host.user_id = g.host_id
		            AND us_host.skill_type = 'mastered'
		            AND us_user.user_id = $1
		            AND us_user.skill_type = 'learning'
		      )
		      OR g.category IN (
		          SELECT s.category FROM user_skills us_user
		          JOIN skills s ON us_user.skill_id = s.id
		          WHERE us_user.user_id = $1
		            AND us_user.skill_type = 'learning'
		      )
		  )
		  AND NOT EXISTS (
		      SELECT 1 FROM memberships m 
		      WHERE m.group_id = g.id 
		        AND m.user_id = $1 
		        AND m.status IN ('accepted', 'pending')
		  )
		  AND (SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id AND m.status = 'accepted') < g.max_capacity
		ORDER BY 
		    CASE 
		        WHEN EXISTS (
		            SELECT 1 FROM user_skills us_host
		            JOIN user_skills us_user ON us_host.skill_id = us_user.skill_id
		            WHERE us_host.user_id = g.host_id
		              AND us_host.skill_type = 'mastered'
		              AND us_user.user_id = $1
		              AND us_user.skill_type = 'learning'
		        ) THEN 1 
		        ELSE 2 
		    END ASC,
		    u.contribution_points DESC,
		    g.start_time ASC
		LIMIT 20
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("groupRepository.FindRecommendations: %w", err)
	}
	defer rows.Close()

	var groups []domain.GroupResponse
	for rows.Next() {
		var resp domain.GroupResponse
		var host domain.UserResponse
		var matchReason string
		var agendaBytes []byte

		err := rows.Scan(
			&resp.ID,
			&resp.HostID,
			&resp.Title,
			&resp.Description,
			&resp.Category,
			&resp.Format,
			&resp.LocationOrLink,
			&resp.Latitude,
			&resp.Longitude,
			&resp.BuildingDetails,
			&agendaBytes,
			&resp.Prerequisites,
			&resp.StartTime,
			&resp.EndTime,
			&resp.MaxCapacity,
			&resp.Status,
			&resp.CreatedAt,
			&host.ID,
			&host.Email,
			&host.FullName,
			&host.Role,
			&host.CampusName,
			&host.Bio,
			&host.AvatarURL,
			&host.ContributionPoints,
			&host.CreatedAt,
			&resp.CurrentMembers,
			&matchReason,
		)
		if err != nil {
			return nil, fmt.Errorf("groupRepository.FindRecommendations.Scan: %w", err)
		}

		if len(agendaBytes) > 0 {
			_ = json.Unmarshal(agendaBytes, &resp.Agenda)
		}
		if resp.Agenda == nil {
			resp.Agenda = []string{}
		}

		resp.Host = &host
		resp.MatchReason = matchReason
		groups = append(groups, resp)
	}

	return groups, nil
}

func (r *groupRepository) CancelByHost(ctx context.Context, hostID uuid.UUID) error {
	query := `
		UPDATE learning_groups
		SET status = 'cancelled', updated_at = NOW()
		WHERE host_id = $1 AND status IN ('open', 'ongoing')
	`
	_, err := r.pool.Exec(ctx, query, hostID)
	if err != nil {
		return fmt.Errorf("groupRepository.CancelByHost: %w", err)
	}
	return nil
}
