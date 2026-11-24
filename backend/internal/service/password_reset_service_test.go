package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/security"
)

type mockResetUserRepo struct {
	users map[string]*domain.User
}

func (m *mockResetUserRepo) Create(ctx context.Context, user *domain.User) error { return nil }
func (m *mockResetUserRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, repository.ErrUserNotFound
}
func (m *mockResetUserRepo) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return nil, repository.ErrUserNotFound
}
func (m *mockResetUserRepo) UpdateProfile(ctx context.Context, user *domain.User) error { return nil }
func (m *mockResetUserRepo) UpdateAccountStatus(ctx context.Context, id uuid.UUID, status domain.AccountStatus, note string) error {
	return nil
}
func (m *mockResetUserRepo) GetUserSkills(ctx context.Context, userID uuid.UUID) ([]domain.UserSkill, error) {
	return nil, nil
}
func (m *mockResetUserRepo) SyncUserSkills(ctx context.Context, userID uuid.UUID, skills []domain.UserSkill) error {
	return nil
}

type mockPasswordResetRepo struct {
	activeByUser map[uuid.UUID]*domain.PasswordResetOTP
	updatedHash  map[uuid.UUID]string
}

func (m *mockPasswordResetRepo) InvalidateActiveByUser(ctx context.Context, userID uuid.UUID) error {
	delete(m.activeByUser, userID)
	return nil
}
func (m *mockPasswordResetRepo) CreateOTP(ctx context.Context, otp *domain.PasswordResetOTP) error {
	m.activeByUser[otp.UserID] = otp
	return nil
}
func (m *mockPasswordResetRepo) FindLatestActiveByUser(ctx context.Context, userID uuid.UUID) (*domain.PasswordResetOTP, error) {
	if rec, ok := m.activeByUser[userID]; ok && rec.UsedAt == nil {
		return rec, nil
	}
	return nil, repository.ErrOTPNotFound
}
func (m *mockPasswordResetRepo) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	for _, rec := range m.activeByUser {
		if rec.ID == id {
			rec.Attempts++
		}
	}
	return nil
}
func (m *mockPasswordResetRepo) MarkUsed(ctx context.Context, id uuid.UUID) error {
	now := time.Now().UTC()
	for _, rec := range m.activeByUser {
		if rec.ID == id {
			rec.UsedAt = &now
		}
	}
	return nil
}
func (m *mockPasswordResetRepo) UpdateUserPasswordHash(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	m.updatedHash[userID] = passwordHash
	return nil
}

func TestPasswordResetService_Flow(t *testing.T) {
	uid := uuid.New()
	userRepo := &mockResetUserRepo{
		users: map[string]*domain.User{
			"nabila@uinsgd.ac.id": {ID: uid, Email: "nabila@uinsgd.ac.id"},
		},
	}
	resetRepo := &mockPasswordResetRepo{
		activeByUser: make(map[uuid.UUID]*domain.PasswordResetOTP),
		updatedHash:  make(map[uuid.UUID]string),
	}

	svc := NewPasswordResetService(userRepo, resetRepo, "development")

	// Unknown email returns neutral response without OTP
	neutralResp, err := svc.RequestReset(context.Background(), domain.ForgotPasswordRequest{
		Email: "tidakada@uinsgd.ac.id",
	})
	require.NoError(t, err)
	assert.Empty(t, neutralResp.DevOTP)

	// Registered email generates 6-digit OTP
	resp, err := svc.RequestReset(context.Background(), domain.ForgotPasswordRequest{
		Email: "nabila@uinsgd.ac.id",
	})
	require.NoError(t, err)
	assert.Len(t, resp.DevOTP, 6)

	// Wrong OTP increments attempts and fails
	err = svc.ConfirmReset(context.Background(), domain.ResetPasswordRequest{
		Email:       "nabila@uinsgd.ac.id",
		OTP:         "000000",
		NewPassword: "passwordBaru123",
	})
	if resp.DevOTP != "000000" {
		assert.ErrorIs(t, err, ErrInvalidOTP)
	}

	// Valid OTP resets password and marks OTP as used
	err = svc.ConfirmReset(context.Background(), domain.ResetPasswordRequest{
		Email:       "nabila@uinsgd.ac.id",
		OTP:         resp.DevOTP,
		NewPassword: "passwordBaru123",
	})
	require.NoError(t, err)
	assert.True(t, security.CheckPasswordHash("passwordBaru123", resetRepo.updatedHash[uid]))

	// Reusing same OTP fails
	err = svc.ConfirmReset(context.Background(), domain.ResetPasswordRequest{
		Email:       "nabila@uinsgd.ac.id",
		OTP:         resp.DevOTP,
		NewPassword: "passwordLain123",
	})
	assert.ErrorIs(t, err, ErrInvalidOTP)
}