package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type EngagementHandler struct {
	engagementService service.EngagementService
}

func NewEngagementHandler(engagementService service.EngagementService) *EngagementHandler {
	return &EngagementHandler{engagementService: engagementService}
}

func (h *EngagementHandler) CreateFeedback(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	reviewerID, ok := userIDVal.(uuid.UUID)
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

	var req domain.CreateFeedbackRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	fb, err := h.engagementService.CreateFeedback(c.Context(), reviewerID, groupID, req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"FEEDBACK_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Ulasan dan apresiasi kontribusi berhasil dikirim!",
		fb,
	))
}

func (h *EngagementHandler) GetFeedbacks(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	feedbacks, err := h.engagementService.GetGroupFeedbacks(c.Context(), groupID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal mengambil ulasan",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Daftar ulasan berhasil diambil",
		feedbacks,
	))
}

func (h *EngagementHandler) CreateReport(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	reporterID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	var req domain.CreateReportRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	report, err := h.engagementService.CreateReport(c.Context(), reporterID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"REPORT_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Laporan Anda telah diterima dan akan ditinjau oleh tim moderator",
		report,
	))
}

func (h *EngagementHandler) ListReports(c *fiber.Ctx) error {
	items, err := h.engagementService.ListModerationItems(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal mengambil daftar laporan",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Daftar laporan moderasi berhasil diambil",
		items,
	))
}

func (h *EngagementHandler) ModerateUser(c *fiber.Ctx) error {
	targetUserID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID pengguna tidak valid",
			nil,
		))
	}

	var req domain.ModerateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	if err := h.engagementService.ModerateUser(c.Context(), targetUserID, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"MODERATION_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Keputusan moderasi berhasil diterapkan",
		nil,
	))
}

func (h *EngagementHandler) ResolveReport(c *fiber.Ctx) error {
	reportID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID laporan tidak valid",
			nil,
		))
	}

	var req domain.UpdateReportStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	if err := h.engagementService.ResolveReport(c.Context(), reportID, req.Status); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"UPDATE_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Status laporan moderasi berhasil diperbarui",
		nil,
	))
}
