package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

type SupportHandler struct {
	supportService service.SupportService
}

func NewSupportHandler(supportService service.SupportService) *SupportHandler {
	return &SupportHandler{supportService: supportService}
}

func (h *SupportHandler) GetMyThread(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	thread, err := h.supportService.GetMyThread(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal memuat ruang bantuan admin",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Ruang percakapan dengan tim admin berhasil diambil",
		thread,
	))
}

func (h *SupportHandler) SendStudentMessage(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	var req domain.CreateSupportMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format pesan tidak valid",
			nil,
		))
	}

	msg, err := h.supportService.SendStudentMessage(c.Context(), userID, req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"SEND_FAILED",
			"Gagal mengirim pesan ke admin",
			nil,
		))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Pesan berhasil dikirim ke tim admin",
		msg,
	))
}

func (h *SupportHandler) AdminListThreads(c *fiber.Ctx) error {
	statusFilter := c.Query("status")
	threads, err := h.supportService.AdminListThreads(c.Context(), statusFilter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal memuat daftar pesan mahasiswa",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Daftar percakapan bantuan mahasiswa berhasil diambil",
		threads,
	))
}

func (h *SupportHandler) AdminGetThreadMessages(c *fiber.Ctx) error {
	threadID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID percakapan tidak valid",
			nil,
		))
	}

	thread, err := h.supportService.AdminGetThreadMessages(c.Context(), threadID)
	if err != nil {
		if errors.Is(err, repository.ErrSupportThreadNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(domain.FailureResponse(
				"THREAD_NOT_FOUND",
				"Percakapan tidak ditemukan",
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal memuat pesan percakapan",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Detail percakapan berhasil diambil",
		thread,
	))
}

func (h *SupportHandler) AdminReplyMessage(c *fiber.Ctx) error {
	adminID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi admin tidak valid",
			nil,
		))
	}

	threadID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID percakapan tidak valid",
			nil,
		))
	}

	var req domain.CreateSupportMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format balasan tidak valid",
			nil,
		))
	}

	msg, err := h.supportService.AdminReplyMessage(c.Context(), adminID, threadID, req.Message)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		if errors.Is(err, repository.ErrSupportThreadNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(domain.FailureResponse(
				"THREAD_NOT_FOUND",
				"Percakapan tidak ditemukan",
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"SEND_FAILED",
			"Gagal mengirim balasan admin",
			nil,
		))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Balasan admin berhasil dikirim",
		msg,
	))
}

func (h *SupportHandler) AdminUpdateThreadStatus(c *fiber.Ctx) error {
	threadID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID percakapan tidak valid",
			nil,
		))
	}

	var req domain.UpdateSupportThreadStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format status tidak valid",
			nil,
		))
	}

	if err := h.supportService.AdminUpdateThreadStatus(c.Context(), threadID, req.Status); err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"UPDATE_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Status percakapan berhasil diperbarui",
		nil,
	))
}
