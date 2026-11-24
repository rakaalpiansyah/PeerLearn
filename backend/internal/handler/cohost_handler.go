package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type CohostHandler struct {
	cohostService service.CohostService
}

func NewCohostHandler(cohostService service.CohostService) *CohostHandler {
	return &CohostHandler{cohostService: cohostService}
}

func (h *CohostHandler) ListByGroup(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID sesi tidak valid", nil))
	}

	list, err := h.cohostService.ListByGroup(c.Context(), groupID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse("FETCH_FAILED", "Gagal memuat daftar Co-Tutor", nil))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse("Daftar Co-Tutor berhasil diambil", list))
}

func (h *CohostHandler) Invite(c *fiber.Ctx) error {
	callerID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi tidak valid", nil))
	}

	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID sesi tidak valid", nil))
	}

	var req domain.InviteCohostRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("BAD_REQUEST", "Format data tidak valid", nil))
	}

	rec, err := h.cohostService.InviteByEmail(c.Context(), callerID, groupID, req.Email)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse("FORBIDDEN", err.Error(), nil))
		}
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse("VALIDATION_FAILED", err.Error(), nil))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse("INTERNAL_SERVER_ERROR", "Gagal mengundang Co-Tutor", nil))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse("Undangan Co-Tutor berhasil dikirim", rec))
}

func (h *CohostHandler) Respond(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi tidak valid", nil))
	}

	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID sesi tidak valid", nil))
	}

	var req domain.RespondCohostRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("BAD_REQUEST", "Format data tidak valid", nil))
	}

	if err := h.cohostService.RespondInvitation(c.Context(), userID, groupID, req.Status); err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse("VALIDATION_FAILED", err.Error(), nil))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("RESPOND_FAILED", err.Error(), nil))
	}

	msg := "Anda resmi bergabung sebagai Co-Tutor pada sesi ini"
	if req.Status == domain.CohostDeclined {
		msg = "Undangan Co-Tutor telah ditolak"
	}
	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(msg, nil))
}

func (h *CohostHandler) Remove(c *fiber.Ctx) error {
	callerID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi tidak valid", nil))
	}

	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID sesi tidak valid", nil))
	}

	targetUserID, err := uuid.Parse(c.Params("userId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("INVALID_UUID", "ID pengguna tidak valid", nil))
	}

	if err := h.cohostService.RemoveCohost(c.Context(), callerID, groupID, targetUserID); err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse("FORBIDDEN", err.Error(), nil))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse("REMOVE_FAILED", err.Error(), nil))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse("Co-Tutor berhasil dihapus dari sesi", nil))
}

func (h *CohostHandler) ListMyInvitations(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse("UNAUTHORIZED", "Otorisasi tidak valid", nil))
	}

	list, err := h.cohostService.ListMyInvitations(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse("FETCH_FAILED", "Gagal memuat undangan Co-Tutor", nil))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse("Daftar undangan Co-Tutor berhasil diambil", list))
}