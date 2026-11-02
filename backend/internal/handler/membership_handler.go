package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

type MembershipHandler struct {
	membershipService service.MembershipService
}

func NewMembershipHandler(membershipService service.MembershipService) *MembershipHandler {
	return &MembershipHandler{membershipService: membershipService}
}

func (h *MembershipHandler) Join(c *fiber.Ctx) error {
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
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	membership, err := h.membershipService.JoinGroup(c.Context(), userID, groupID)
	if err != nil {
		if errors.Is(err, repository.ErrAlreadyJoined) {
			return c.Status(fiber.StatusConflict).JSON(domain.FailureResponse(
				"ALREADY_JOINED",
				"Anda sudah mengajukan permohonan atau terdaftar di sesi belajar ini",
				nil,
			))
		}
		if errors.Is(err, service.ErrGroupFull) {
			return c.Status(fiber.StatusConflict).JSON(domain.FailureResponse(
				"GROUP_FULL",
				"Kapasitas kuota peserta sesi belajar telah penuh",
				nil,
			))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"JOIN_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusCreated).JSON(domain.SuccessResponse(
		"Permintaan bergabung berhasil dikirim ke penyelenggara!",
		membership,
	))
}

func (h *MembershipHandler) GetMembers(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID sesi belajar tidak valid",
			nil,
		))
	}

	var callerID uuid.UUID
	if userIDVal := c.Locals("userID"); userIDVal != nil {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			callerID = uid
		}
	}

	members, err := h.membershipService.GetGroupMembers(c.Context(), groupID, callerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal mengambil daftar peserta sesi",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Daftar peserta sesi berhasil diambil",
		members,
	))
}

func (h *MembershipHandler) UpdateStatus(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	callerID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	membershipID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"INVALID_UUID",
			"ID keanggotaan tidak valid",
			nil,
		))
	}

	var req domain.UpdateMembershipStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"BAD_REQUEST",
			"Format data tidak valid",
			nil,
		))
	}

	if err := h.membershipService.UpdateStatus(c.Context(), callerID, membershipID, req.Status); err != nil {
		if errors.Is(err, service.ErrUnauthorizedAction) {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse(
				"FORBIDDEN",
				"Anda tidak memiliki otorisasi untuk mengubah status keanggotaan ini",
				nil,
			))
		}
		return c.Status(fiber.StatusBadRequest).JSON(domain.FailureResponse(
			"UPDATE_STATUS_FAILED",
			err.Error(),
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Status keanggotaan peserta berhasil diperbarui",
		nil,
	))
}

func (h *MembershipHandler) GetMySessions(c *fiber.Ctx) error {
	userIDVal := c.Locals("userID")
	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
			"UNAUTHORIZED",
			"Otorisasi pengguna tidak valid",
			nil,
		))
	}

	sessions, err := h.membershipService.GetMySessions(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"FETCH_FAILED",
			"Gagal memuat sesi belajar Anda",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"Data sesi belajar Anda berhasil diambil",
		sessions,
	))
}
