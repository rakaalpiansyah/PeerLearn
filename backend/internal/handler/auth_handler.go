package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req domain.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Payload JSON tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	res, err := h.authService.Register(c.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrEmailExists) {
			return c.Status(fiber.StatusConflict).JSON(domain.FailureResponse(
				"EMAIL_ALREADY_EXISTS",
				"Alamat email sudah terdaftar. Silakan gunakan email lain atau masuk.",
				nil,
			))
		}
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"INTERNAL_SERVER_ERROR",
			"Gagal memproses pendaftaran",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Pendaftaran berhasil! Selamat datang di PeerLearn.",
		res,
	))
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Payload JSON tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	res, err := h.authService.Login(c.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
				"INVALID_CREDENTIALS",
				"Email atau kata sandi yang Anda masukkan salah.",
				nil,
			))
		}
		return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
			"VALIDATION_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Otentikasi berhasil",
		res,
	))
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Konteks sesi pengguna tidak valid",
			nil,
		))
	}

	profile, err := h.authService.GetMe(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(domain.FailureResponse(
			"USER_NOT_FOUND",
			"Data profil pengguna tidak ditemukan",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Profil pengguna berhasil diambil",
		profile,
	))
}

func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req domain.ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("BAD_REQUEST", "Format permintaan tidak valid", nil))
	}

	resp, err := h.authService.RequestPasswordReset(c.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse("VALIDATION_FAILED", err.Error(), nil))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse("FORGOT_PASSWORD_FAILED", "Gagal memproses permintaan atur ulang kata sandi", nil))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(resp.Message, resp))
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req domain.ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("BAD_REQUEST", "Format permintaan tidak valid", nil))
	}

	if err := h.authService.ResetPassword(c.Context(), req); err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse("VALIDATION_FAILED", err.Error(), nil))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("RESET_PASSWORD_FAILED", err.Error(), nil))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse("Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.", nil))
}

func (h *AuthHandler) RequestEmailVerification(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi pengguna tidak valid", nil))
	}

	resp, err := h.authService.RequestEmailVerification(c.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse("VALIDATION_FAILED", err.Error(), nil))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse("VERIFY_REQUEST_FAILED", "Gagal membuat kode verifikasi email", nil))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(resp.Message, resp))
}

func (h *AuthHandler) ConfirmEmailVerification(c *fiber.Ctx) error {
	var req domain.VerifyEmailConfirmRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("BAD_REQUEST", "Format permintaan tidak valid", nil))
	}

	updatedUser, err := h.authService.ConfirmEmailVerification(c.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse("VALIDATION_FAILED", err.Error(), nil))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("VERIFY_CONFIRM_FAILED", err.Error(), nil))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse("Email kampus berhasil diverifikasi.", updatedUser))
}
