package service_test

import (
	"context"
	"errors"
	"testing"

	"peerlearn/backend/internal/service"
)

type mockHealthRepository struct {
	pingErr error
	counts  map[string]int
}

func (m *mockHealthRepository) Ping(ctx context.Context) error {
	return m.pingErr
}

func (m *mockHealthRepository) GetTableCounts(ctx context.Context) (map[string]int, error) {
	return m.counts, nil
}

func TestHealthService_Healthy(t *testing.T) {
	mockRepo := &mockHealthRepository{
		pingErr: nil,
		counts: map[string]int{
			"skills": 8,
			"users":  0,
		},
	}

	svc := service.NewHealthService(mockRepo)
	status, err := svc.CheckHealth(context.Background())

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if status.Status != "healthy" {
		t.Errorf("expected status 'healthy', got: %s", status.Status)
	}

	if status.Database != "connected" {
		t.Errorf("expected database 'connected', got: %s", status.Database)
	}

	if status.Counts["skills"] != 8 {
		t.Errorf("expected skills count 8, got: %d", status.Counts["skills"])
	}
}

func TestHealthService_Degraded(t *testing.T) {
	mockRepo := &mockHealthRepository{
		pingErr: errors.New("connection refused"),
	}

	svc := service.NewHealthService(mockRepo)
	status, err := svc.CheckHealth(context.Background())

	if err == nil {
		t.Fatalf("expected error for degraded service, got nil")
	}

	if status.Status != "degraded" {
		t.Errorf("expected status 'degraded', got: %s", status.Status)
	}

	if status.Database != "disconnected" {
		t.Errorf("expected database 'disconnected', got: %s", status.Database)
	}
}
