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
