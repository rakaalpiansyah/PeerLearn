package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/security"
)

const (
	otpTTLMinutes  = 15
	maxOTPAttempts = 5
)

var (
	ErrInvalidOTP         = errors.New("service: invalid or expired otp")
	ErrOTPAttemptsReached = errors.New("service: maximum otp attempts reached")
)

type PasswordResetService interface {
	RequestReset(ctx context.Context, req domain.ForgotPasswordRequest) (*domain.ForgotPasswordResponse, error)
	ConfirmReset(ctx context.Context, req domain.ResetPasswordRequest) error
}

type passwordResetService struct {
	userRepo  repository.UserRepository
	resetRepo repository.PasswordResetRepository
	appEnv    string
}

func NewPasswordResetService(
	userRepo repository.UserRepository,
	resetRepo repository.PasswordResetRepository,
	appEnv string,
) PasswordResetService {
	return &passwordResetService{
		userRepo:  userRepo,
		resetRepo: resetRepo,
		appEnv:    appEnv,
	}
}

func generateSixDigitOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func (s *passwordResetService) RequestReset(ctx context.Context, req domain.ForgotPasswordRequest) (*domain.ForgotPasswordResponse, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		return nil, fmt.Errorf("%w: alamat email yang valid wajib diisi", ErrInvalidInput)
	}

	resp := &domain.ForgotPasswordResponse{
		ExpiresInMinutes: otpTTLMinutes,
	}

	// Neutral response when email does not exist to prevent account enumeration
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil || user == nil {
		return resp, nil
	}

	otpCode, err := generateSixDigitOTP()
	if err != nil {
		return nil, fmt.Errorf("passwordResetService.RequestReset generate otp: %w", err)
	}

	otpHash, err := security.HashPassword(otpCode)
	if err != nil {
		return nil, fmt.Errorf("passwordResetService.RequestReset hash otp: %w", err)
	}

	if err := s.resetRepo.InvalidateActiveByUser(ctx, user.ID); err != nil {
		return nil, err
	}

	record := &domain.PasswordResetOTP{
		ID:        uuid.New(),
		UserID:    user.ID,
		OTPHash:   otpHash,
		ExpiresAt: time.Now().UTC().Add(otpTTLMinutes * time.Minute),
		Attempts:  0,
	}
	if err := s.resetRepo.CreateOTP(ctx, record); err != nil {
		return nil, err
	}

	if strings.EqualFold(s.appEnv, "development") {
		log.Printf("[Auth][DEV] Kode OTP reset password untuk %s: %s (berlaku %d menit)", email, otpCode, otpTTLMinutes)
		resp.DevOTP = otpCode
	}

	return resp, nil
}

func (s *passwordResetService) ConfirmReset(ctx context.Context, req domain.ResetPasswordRequest) error {
	email := strings.TrimSpace(strings.ToLower(req.Email))
	otp := strings.TrimSpace(req.OTP)

	if email == "" || !strings.Contains(email, "@") {
		return fmt.Errorf("%w: alamat email tidak valid", ErrInvalidInput)
	}
	if len(otp) != 6 {
		return fmt.Errorf("%w: kode OTP harus terdiri dari 6 digit", ErrInvalidInput)
	}
	if len(req.NewPassword) < 6 {
		return fmt.Errorf("%w: kata sandi baru minimal 6 karakter", ErrInvalidInput)
	}

	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil || user == nil {
		return ErrInvalidOTP
	}

	record, err := s.resetRepo.FindLatestActiveByUser(ctx, user.ID)
	if err != nil || record == nil {
		return ErrInvalidOTP
	}

	if time.Now().UTC().After(record.ExpiresAt) {
		_ = s.resetRepo.MarkUsed(ctx, record.ID)
		return ErrInvalidOTP
	}

	if record.Attempts >= maxOTPAttempts {
		_ = s.resetRepo.MarkUsed(ctx, record.ID)
		return ErrOTPAttemptsReached
	}

	if !security.CheckPasswordHash(otp, record.OTPHash) {
		_ = s.resetRepo.IncrementAttempts(ctx, record.ID)
		if record.Attempts+1 >= maxOTPAttempts {
			_ = s.resetRepo.MarkUsed(ctx, record.ID)
			return ErrOTPAttemptsReached
		}
		return ErrInvalidOTP
	}

	newHash, err := security.HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("passwordResetService.ConfirmReset hash password: %w", err)
	}

	if err := s.resetRepo.UpdateUserPasswordHash(ctx, user.ID, newHash); err != nil {
		return err
	}

	return s.resetRepo.MarkUsed(ctx, record.ID)
}