package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"peerlearn/backend/internal/domain"
)

type mockMasterRepo struct {
	faculties   []domain.Faculty
	departments []domain.Department
	locations   []domain.CampusLocation
}

func (m *mockMasterRepo) ListActiveFaculties(ctx context.Context) ([]domain.Faculty, error) {
	return m.faculties, nil
}
func (m *mockMasterRepo) ListActiveDepartments(ctx context.Context) ([]domain.Department, error) {
	return m.departments, nil
}
func (m *mockMasterRepo) ListActiveLocations(ctx context.Context) ([]domain.CampusLocation, error) {
	return m.locations, nil
}

func TestMasterService_GetMasterCatalog(t *testing.T) {
	fstID := uuid.New()
	repo := &mockMasterRepo{
		faculties: []domain.Faculty{
			{ID: fstID, Code: "FST", Name: "Fakultas Sains dan Teknologi", IsActive: true},
		},
		departments: []domain.Department{
			{ID: uuid.New(), FacultyID: fstID, Name: "Teknik Informatika", DegreeLevel: "S1", IsActive: true},
		},
		locations: []domain.CampusLocation{
			{ID: uuid.New(), FacultyID: &fstID, Name: "Gedung FST", ShortLabel: "FST UIN SGD", IsActive: true},
			{ID: uuid.New(), FacultyID: nil, Name: "Perpustakaan Utama", ShortLabel: "Perpus UIN SGD", IsActive: true},
		},
	}

	svc := NewMasterService(repo)
	catalog, err := svc.GetMasterCatalog(context.Background())

	require.NoError(t, err)
	require.Len(t, catalog.Faculties, 1)
	assert.Len(t, catalog.Faculties[0].Departments, 1)
	assert.Len(t, catalog.Faculties[0].Locations, 1)
	assert.Len(t, catalog.SharedLocations, 1)
}