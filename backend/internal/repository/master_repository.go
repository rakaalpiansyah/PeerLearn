package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

type MasterRepository struct {
	pool *pgxpool.Pool
}

func NewMasterRepository(pool *pgxpool.Pool) *MasterRepository {
	return &MasterRepository{pool: pool}
}

func (r *MasterRepository) ListActiveFaculties(ctx context.Context) ([]domain.Faculty, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, code, name, is_active, created_at
		FROM faculties
		WHERE is_active = TRUE
		ORDER BY CASE WHEN code = 'FST' THEN 0 WHEN code = 'UMUM' THEN 2 ELSE 1 END, name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	faculties := make([]domain.Faculty, 0)
	for rows.Next() {
		var f domain.Faculty
		if err := rows.Scan(&f.ID, &f.Code, &f.Name, &f.IsActive, &f.CreatedAt); err != nil {
			return nil, err
		}
		f.Departments = []domain.Department{}
		f.Locations = []domain.CampusLocation{}
		faculties = append(faculties, f)
	}
	return faculties, rows.Err()
}

func (r *MasterRepository) ListActiveDepartments(ctx context.Context) ([]domain.Department, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, faculty_id, name, degree_level, is_active, created_at
		FROM departments
		WHERE is_active = TRUE
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	departments := make([]domain.Department, 0)
	for rows.Next() {
		var d domain.Department
		if err := rows.Scan(&d.ID, &d.FacultyID, &d.Name, &d.DegreeLevel, &d.IsActive, &d.CreatedAt); err != nil {
			return nil, err
		}
		departments = append(departments, d)
	}
	return departments, rows.Err()
}

func (r *MasterRepository) ListActiveLocations(ctx context.Context) ([]domain.CampusLocation, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, faculty_id, name, short_label, building_details, latitude, longitude, is_active, created_at
		FROM campus_locations
		WHERE is_active = TRUE
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	locations := make([]domain.CampusLocation, 0)
	for rows.Next() {
		var loc domain.CampusLocation
		if err := rows.Scan(
			&loc.ID,
			&loc.FacultyID,
			&loc.Name,
			&loc.ShortLabel,
			&loc.BuildingDetails,
			&loc.Latitude,
			&loc.Longitude,
			&loc.IsActive,
			&loc.CreatedAt,
		); err != nil {
			return nil, err
		}
		locations = append(locations, loc)
	}
	return locations, rows.Err()
}

func (r *MasterRepository) FacultyExists(ctx context.Context, id uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM faculties WHERE id = $1 AND is_active = TRUE)`, id).Scan(&exists)
	return exists, err
}