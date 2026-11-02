package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type UserHandler struct {
	userService service.UserService
}

func NewUserHandler(userService service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	var req domain.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Payload format JSON tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	updated, err := h.userService.UpdateProfile(c.Context(), userID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"PROFILE_UPDATE_FAILED",
			"Gagal memperbarui profil pengguna",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Profil berhasil diperbarui",
		updated,
	))
}

func (h *UserHandler) GetSkills(c *fiber.Ctx) error {
	skills, err := h.userService.GetSkills(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"SKILLS_FETCH_FAILED",
			"Gagal mengambil katalog keahlian",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Katalog keahlian berhasil diambil",
		skills,
	))
}

func (h *UserHandler) SetSkills(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	var req domain.UpdateSkillsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Payload format JSON tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	if err := h.userService.SyncSkills(c.Context(), userID, req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"SKILLS_SYNC_FAILED",
			"Gagal menyimpan keahlian pengguna",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Keahlian pengguna berhasil diperbarui",
		nil,
	))
}

func (h *UserHandler) AddCustomSkill(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	var req domain.AddCustomSkillRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	skill, err := h.userService.AddCustomSkill(c.Context(), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"ADD_SKILL_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Keahlian kustom berhasil ditambahkan",
		skill,
	))
}

func (h *UserHandler) GetPublicProfile(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID pengguna tidak valid",
			nil,
		))
	}

	profile, err := h.userService.GetPublicProfile(c.Context(), targetID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(domain.FailureResponse(
			"USER_NOT_FOUND",
			"Profil pengguna tidak ditemukan",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Profil publik berhasil diambil",
		profile,
	))
}
