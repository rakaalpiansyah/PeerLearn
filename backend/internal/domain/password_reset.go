package domain

import (
	"time"

	"github.com/google/uuid"
)

type PasswordResetOTP struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	OTPHash   string     `json:"-"`
	ExpiresAt time.Time  `json:"expires_at"`
	Attempts  int        `json:"attempts"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ForgotPasswordResponse struct {
	ExpiresInMinutes int    `json:"expires_in_minutes"`
	DevOTP           string `json:"dev_otp,omitempty"`
}

type ResetPasswordRequest struct {
	Email       string `json:"email"`
	OTP         string `json:"otp"`
	NewPassword string `json:"new_password"`
}