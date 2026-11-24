package handler

import (
	"github.com/gofiber/fiber/v2"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type MasterHandler struct {
	masterService *service.MasterService
}

func NewMasterHandler(masterService *service.MasterService) *MasterHandler {
	return &MasterHandler{masterService: masterService}
}

func (h *MasterHandler) GetMasterCatalog(c *fiber.Ctx) error {
	catalog, err := h.masterService.GetMasterCatalog(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.FailureResponse(
			"INTERNAL_ERROR",
			"Gagal memuat data master fakultas dan lokasi kampus",
			nil,
		))
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Data master fakultas berhasil dimuat",
		"data":    catalog,
	})
}