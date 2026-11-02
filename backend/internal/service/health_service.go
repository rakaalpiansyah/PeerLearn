package service

import (
	"context"
	"fmt"
	"time"

	"peerlearn/backend/internal/repository"
)

type HealthStatus struct {
	Status    string         `json:"status"`
	Database  string         `json:"database"`
	Timestamp time.Time      `json:"timestamp"`
	Counts    map[string]int `json:"entity_counts,omitempty"`
}

type HealthService interface {
	CheckHealth(ctx context.Context) (*HealthStatus, error)
}

type healthService struct {
	repo repository.HealthRepository
}

func NewHealthService(repo repository.HealthRepository) HealthService {
	return &healthService{repo: repo}
}

func (s *healthService) CheckHealth(ctx context.Context) (*HealthStatus, error) {
	dbStatus := "connected"
	if err := s.repo.Ping(ctx); err != nil {
		dbStatus = "disconnected"
		return &HealthStatus{
			Status:    "degraded",
			Database:  dbStatus,
			Timestamp: time.Now().UTC(),
		}, fmt.Errorf("service.CheckHealth ping failure: %w", err)
	}

	counts, _ := s.repo.GetTableCounts(ctx)

	return &HealthStatus{
		Status:    "healthy",
		Database:  dbStatus,
		Timestamp: time.Now().UTC(),
		Counts:    counts,
	}, nil
}
