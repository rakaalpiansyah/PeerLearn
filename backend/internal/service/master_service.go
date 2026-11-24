package service

import (
	"context"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
)

type MasterRepositoryInterface interface {
	ListActiveFaculties(ctx context.Context) ([]domain.Faculty, error)
	ListActiveDepartments(ctx context.Context) ([]domain.Department, error)
	ListActiveLocations(ctx context.Context) ([]domain.CampusLocation, error)
}

type MasterService struct {
	repo MasterRepositoryInterface
}

func NewMasterService(repo MasterRepositoryInterface) *MasterService {
	return &MasterService{repo: repo}
}

func (s *MasterService) GetMasterCatalog(ctx context.Context) (*domain.MasterCatalog, error) {
	faculties, err := s.repo.ListActiveFaculties(ctx)
	if err != nil {
		return nil, err
	}
	departments, err := s.repo.ListActiveDepartments(ctx)
	if err != nil {
		return nil, err
	}
	locations, err := s.repo.ListActiveLocations(ctx)
	if err != nil {
		return nil, err
	}

	facultyIndex := make(map[uuid.UUID]int, len(faculties))
	for i := range faculties {
		facultyIndex[faculties[i].ID] = i
	}

	for _, d := range departments {
		if idx, ok := facultyIndex[d.FacultyID]; ok {
			faculties[idx].Departments = append(faculties[idx].Departments, d)
		}
	}

	sharedLocations := make([]domain.CampusLocation, 0)
	for _, loc := range locations {
		if loc.FacultyID == nil {
			sharedLocations = append(sharedLocations, loc)
			continue
		}
		if idx, ok := facultyIndex[*loc.FacultyID]; ok {
			faculties[idx].Locations = append(faculties[idx].Locations, loc)
		}
	}

	return &domain.MasterCatalog{
		Faculties:       faculties,
		SharedLocations: sharedLocations,
	}, nil
}