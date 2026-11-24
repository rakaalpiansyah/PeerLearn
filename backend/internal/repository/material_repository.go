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

var ErrMaterialNotFound = errors.New("repository: group material not found")

type GroupMaterialRepository interface {
	Create(ctx context.Context, m *domain.GroupMaterial) error
	ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.GroupMaterial, error)
	FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupMaterial, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type groupMaterialRepository struct {
	pool *pgxpool.Pool
}

func NewGroupMaterialRepository(pool *pgxpool.Pool) GroupMaterialRepository {
	return &groupMaterialRepository{pool: pool}
}

func (r *groupMaterialRepository) Create(ctx context.Context, m *domain.GroupMaterial) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	m.CreatedAt = time.Now().UTC()
	if m.MaterialType == "" {
		m.MaterialType = "referensi"
	}

	query := `
		INSERT INTO group_materials (id, group_id, uploaded_by, title, url, material_type, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	if _, err := r.pool.Exec(ctx, query, m.ID, m.GroupID, m.UploadedBy, m.Title, m.URL, m.MaterialType, m.CreatedAt); err != nil {
		return fmt.Errorf("groupMaterialRepository.Create: %w", err)
	}
	return nil
}

func (r *groupMaterialRepository) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.GroupMaterial, error) {
	query := `
		SELECT
			gm.id, gm.group_id, gm.uploaded_by, gm.title, gm.url, gm.material_type, gm.created_at,
			u.id, u.full_name, u.role, u.campus_name, u.avatar_url
		FROM group_materials gm
		JOIN users u ON gm.uploaded_by = u.id
		WHERE gm.group_id = $1
		ORDER BY gm.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("groupMaterialRepository.ListByGroup: %w", err)
	}
	defer rows.Close()

	list := make([]domain.GroupMaterial, 0)
	for rows.Next() {
		var m domain.GroupMaterial
		var uploader domain.UserResponse
		if err := rows.Scan(
			&m.ID, &m.GroupID, &m.UploadedBy, &m.Title, &m.URL, &m.MaterialType, &m.CreatedAt,
			&uploader.ID, &uploader.FullName, &uploader.Role, &uploader.CampusName, &uploader.AvatarURL,
		); err != nil {
			return nil, fmt.Errorf("groupMaterialRepository.ListByGroup.Scan: %w", err)
		}
		m.Uploader = &uploader
		list = append(list, m)
	}
	return list, nil
}

func (r *groupMaterialRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupMaterial, error) {
	query := `
		SELECT id, group_id, uploaded_by, title, url, material_type, created_at
		FROM group_materials
		WHERE id = $1
	`
	var m domain.GroupMaterial
	err := r.pool.QueryRow(ctx, query, id).Scan(&m.ID, &m.GroupID, &m.UploadedBy, &m.Title, &m.URL, &m.MaterialType, &m.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMaterialNotFound
		}
		return nil, fmt.Errorf("groupMaterialRepository.FindByID: %w", err)
	}
	return &m, nil
}

func (r *groupMaterialRepository) Delete(ctx context.Context, id uuid.UUID) error {
	cmd, err := r.pool.Exec(ctx, `DELETE FROM group_materials WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("groupMaterialRepository.Delete: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrMaterialNotFound
	}
	return nil
}
