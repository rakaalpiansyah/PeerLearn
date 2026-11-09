package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type MessageHandler struct {
	messageService service.MessageService
}

func NewMessageHandler(messageService service.MessageService) *MessageHandler {
	return &MessageHandler{messageService: messageService}
}

func (h *MessageHandler) SendMessage(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
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
			"ID grup tidak valid",
			nil,
		))
	}

	var req domain.SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	msg, err := h.messageService.SendMessage(c.Context(), userID, groupID, req.Message, req.ReplyToMessageID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse(
				"FORBIDDEN",
				"Hanya peserta terkonfirmasi dan host yang dapat berdiskusi di grup ini",
				nil,
			))
		}
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"SEND_MESSAGE_FAILED",
			"Gagal mengirim pesan diskusi",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Pesan berhasil dikirim",
		msg,
	))
}

func (h *MessageHandler) GetMessages(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
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
			"ID grup tidak valid",
			nil,
		))
	}

	messages, err := h.messageService.GetMessages(c.Context(), userID, groupID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse(
				"FORBIDDEN",
				"Hanya peserta terkonfirmasi dan host yang dapat mengakses riwayat pesan",
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"GET_MESSAGES_FAILED",
			"Gagal mengambil riwayat pesan",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Riwayat pesan berhasil diambil",
		messages,
	))
}

func (h *MessageHandler) ToggleReaction(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
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
			"ID grup tidak valid",
			nil,
		))
	}

	messageID, err := uuid.Parse(c.Params("messageId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID pesan tidak valid",
			nil,
		))
	}

	var req domain.ToggleReactionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			[]domain.ErrorDetail{{Field: "body", Message: err.Error()}},
		))
	}

	reactions, err := h.messageService.ToggleReaction(c.Context(), userID, groupID, messageID, req.Emoji)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse(
				"FORBIDDEN",
				"Hanya peserta terkonfirmasi dan host yang dapat bereaksi di sesi ini",
				nil,
			))
		}
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"TOGGLE_REACTION_FAILED",
			"Gagal memperbarui reaksi pesan",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Reaksi pesan berhasil diperbarui",
		reactions,
	))
}

func (h *MessageHandler) TogglePin(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
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
			"ID grup tidak valid",
			nil,
		))
	}

	messageID, err := uuid.Parse(c.Params("messageId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID pesan tidak valid",
			nil,
		))
	}

	msg, err := h.messageService.TogglePinMessage(c.Context(), userID, groupID, messageID)
	if err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse(
				"FORBIDDEN",
				"Hanya host sesi belajar yang dapat menyematkan pesan",
				nil,
			))
		}
		if errors.Is(err, service.ErrInvalidInput) {
			return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
				"VALIDATION_FAILED",
				err.Error(),
				nil,
			))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"TOGGLE_PIN_FAILED",
			"Gagal mengubah status sematan pesan",
			[]domain.ErrorDetail{{Message: err.Error()}},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Status sematan pesan berhasil diperbarui",
		msg,
	))
}
