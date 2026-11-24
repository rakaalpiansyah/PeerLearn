package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type StudyRequestHandler struct {
	studyRequestService service.StudyRequestService
}

func NewStudyRequestHandler(studyRequestService service.StudyRequestService) *StudyRequestHandler {
	return &StudyRequestHandler{studyRequestService: studyRequestService}
}

func (h *StudyRequestHandler) List(c *fiber.Ctx) error {
	var viewerID *uuid.UUID
	if userIDVal := c.Locals("userID"); userIDVal != nil {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			viewerID = &uid
		}
	}

	filter := domain.StudyRequestFilter{
		Category: c.Query("category"),
		Status:   domain.StudyRequestStatus(c.Query("status")),
		Search:   c.Query("search"),
	}

	items, err := h.studyRequestService.List(c.Context(), filter, viewerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal memuat papan usulan topik belajar",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Daftar usulan topik berhasil diambil",
		items,
	))
}

func (h *StudyRequestHandler) Create(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi pengguna tidak valid", nil))
	}

	var req domain.CreateStudyRequestPayload
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("BAD_REQUEST", "Format data usulan topik tidak valid", nil))
	}

	created, err := h.studyRequestService.Create(c.Context(), userID, req)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse("FORBIDDEN", err.Error(), nil))
		}
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse("VALIDATION_FAILED", err.Error(), nil))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse("CREATE_FAILED", err.Error(), nil))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Usulan topik belajar berhasil dikirim ke papan komunitas",
		created,
	))
}

func (h *StudyRequestHandler) ToggleVote(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi pengguna tidak valid", nil))
	}

	requestID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID usulan topik tidak valid", nil))
	}

	result, err := h.studyRequestService.ToggleVote(c.Context(), requestID, userID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse("FORBIDDEN", err.Error(), nil))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("VOTE_FAILED", err.Error(), nil))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Dukungan topik berhasil diperbarui",
		result,
	))
}
