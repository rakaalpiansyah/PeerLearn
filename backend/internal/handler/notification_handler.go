package handler

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

type NotificationHandler struct {
	notificationService service.NotificationService
}

func NewNotificationHandler(notificationService service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: notificationService}
}

func (h *NotificationHandler) List(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	limit := 30
	if raw := c.Query("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	res, err := h.notificationService.ListForUser(c.Context(), userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal memuat notifikasi",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Daftar notifikasi berhasil diambil",
		res,
	))
}

func (h *NotificationHandler) MarkRead(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	notifID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID notifikasi tidak valid",
			nil,
		))
	}

	if err := h.notificationService.MarkRead(c.Context(), userID, notifID); err != nil {
		if errors.Is(err, repository.ErrNotificationNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(domain.FailureResponse(
				"NOTIFICATION_NOT_FOUND",
				"Notifikasi tidak ditemukan",
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"UPDATE_FAILED",
			"Gagal memperbarui status notifikasi",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Notifikasi ditandai sudah dibaca",
		nil,
	))
}

func (h *NotificationHandler) MarkAllRead(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	if err := h.notificationService.MarkAllRead(c.Context(), userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"UPDATE_FAILED",
			"Gagal menandai seluruh notifikasi sebagai dibaca",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Seluruh notifikasi ditandai sudah dibaca",
		nil,
	))
}
