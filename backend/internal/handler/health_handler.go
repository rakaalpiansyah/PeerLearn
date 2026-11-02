package handler

import (
	"github.com/gofiber/fiber/v2"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type HealthHandler struct {
	service service.HealthService
}

func NewHealthHandler(service service.HealthService) *HealthHandler {
	return &HealthHandler{service: service}
}

func (h *HealthHandler) Check(c *fiber.Ctx) error {
	ctx := c.Context()
	health, err := h.service.CheckHealth(ctx)
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(domain.FailureResponse(
			"SERVICE_DEGRADED",
			"PeerLearn system is running with degraded dependencies",
			[]domain.ErrorDetail{
				{Field: "database", Message: err.Error()},
			},
		))
	}

	return c.Status(fiber.StatusOK).JSON(domain.SuccessResponse(
		"PeerLearn core service is operational",
		health,
	))
}
