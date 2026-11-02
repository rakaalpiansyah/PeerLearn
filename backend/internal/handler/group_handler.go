package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type GroupHandler struct {
	groupService service.GroupService
}

func NewGroupHandler(groupService service.GroupService) *GroupHandler {
	return &GroupHandler{groupService: groupService}
}

func (h *GroupHandler) Create(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	hostID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	var req domain.CreateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	group, err := h.groupService.Create(c.Context(), hostID, req)
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
			"Gagal membuat sesi belajar",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Sesi belajar berhasil dipublikasikan!",
		group,
	))
}

func (h *GroupHandler) List(c *fiber.Ctx) error {
	var currentUserID *uuid.UUID
	if userIDVal := c.Locals("userID"); userIDVal != nil {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			currentUserID = &uid
		}
	}

	filter := domain.GroupFilter{
		Category: c.Query("category"),
		Format:   domain.GroupFormat(c.Query("format")),
		Status:   domain.GroupStatus(c.Query("status")),
		Search:   c.Query("search"),
	}

	groups, err := h.groupService.List(c.Context(), filter, currentUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal memuat daftar sesi belajar",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Daftar sesi belajar berhasil diambil",
		groups,
	))
}

func (h *GroupHandler) GetByID(c *fiber.Ctx) error {
	idStr := c.Params("id")
	groupID, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	var currentUserID *uuid.UUID
	if userIDVal := c.Locals("userID"); userIDVal != nil {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			currentUserID = &uid
		}
	}

	group, err := h.groupService.GetByID(c.Context(), groupID, currentUserID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(domain.FailureResponse(
			"GROUP_NOT_FOUND",
			"Sesi belajar tidak ditemukan",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Detail sesi belajar berhasil diambil",
		group,
	))
}

func (h *GroupHandler) Update(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	hostID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	var req domain.UpdateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	if err := h.groupService.Update(c.Context(), hostID, groupID, req); err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse(
				"FORBIDDEN",
				"Anda bukan penyelenggara sesi belajar ini",
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"UPDATE_FAILED",
			"Gagal memperbarui informasi sesi belajar",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Sesi belajar berhasil diperbarui",
		nil,
	))
}

func (h *GroupHandler) UpdateStatus(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	hostID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	var req struct {
		Status domain.GroupStatus `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	if err := h.groupService.UpdateStatus(c.Context(), hostID, groupID, req.Status); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"STATUS_CHANGE_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Status sesi belajar berhasil diubah",
		nil,
	))
}

func (h *GroupHandler) GetRecommendations(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	groups, err := h.groupService.GetRecommendations(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"INTERNAL_SERVER_ERROR",
			"Gagal mengambil rekomendasi sesi belajar",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Rekomendasi sesi belajar berhasil dimuat",
		groups,
	))
}

func (h *GroupHandler) ResolveMapLink(c *fiber.Ctx) error {
	var req domain.ResolveMapLinkRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			[]domain.ErrorDetail{{Field: "url", Message: err.Error()}},
		))
	}

	result, err := h.groupService.ResolveMapLink(c.Context(), req.URL)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_MAP_LINK",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Titik koordinat berhasil dideteksi",
		result,
	))
}
