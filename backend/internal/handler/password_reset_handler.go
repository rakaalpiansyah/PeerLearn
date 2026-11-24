package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type PasswordResetHandler struct {
	resetService service.PasswordResetService
}

func NewPasswordResetHandler(resetService service.PasswordResetService) *PasswordResetHandler {
	return &PasswordResetHandler{resetService: resetService}
}

func (h *PasswordResetHandler) ForgotPassword(c *fiber.Ctx) error {
	var req domain.ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Payload JSON tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	res, err := h.resetService.RequestReset(c.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"INTERNAL_SERVER_ERROR",
			"Gagal memproses permintaan reset kata sandi",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Jika email terdaftar, kode OTP 6 digit telah dikirim dan berlaku 15 menit.",
		res,
	))
}

func (h *PasswordResetHandler) ResetPassword(c *fiber.Ctx) error {
	var req domain.ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Payload JSON tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	if err := h.resetService.ConfirmReset(c.Context(), req); err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		if errors.Is(err, service.ErrOTPAttemptsReached) {
			return c.Status(fiber.StatusTooManyRequests).JSON(domain.FailureResponse(
				"OTP_ATTEMPTS_EXCEEDED",
				"Batas percobaan OTP tercapai. Silakan minta kode OTP baru.",
				nil,
			))
		}
		if errors.Is(err, service.ErrInvalidOTP) {
			return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
				"INVALID_OTP",
				"Kode OTP tidak valid atau sudah kedaluwarsa.",
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"INTERNAL_SERVER_ERROR",
			"Gagal memperbarui kata sandi",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.",
		nil,
	))
}