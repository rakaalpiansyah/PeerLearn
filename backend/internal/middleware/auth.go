package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/security"
)

func JWTMiddleware(jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
				"UNAUTHORIZED",
				"Header Authorization diperlukan",
				nil,
			))
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
				"UNAUTHORIZED",
				"Format token harus: Bearer <token>",
				nil,
			))
		}

		claims, err := security.ValidateToken(parts[1], jwtSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(domain.FailureResponse(
				"UNAUTHORIZED",
				"Token otentikasi tidak valid atau telah kedaluwarsa",
				[]domain.ErrorDetail{{Field: "token", Message: err.Error()}},
			))
		}

		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

func RequireRole(allowedRoles ...domain.UserRole) fiber.Handler {
	return func(c *fiber.Ctx) error {
		roleVal := c.Locals("role")
		userRole, ok := roleVal.(domain.UserRole)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse(
				"FORBIDDEN",
				"Akses ditolak: role pengguna tidak dikenali",
				nil,
			))
		}

		for _, r := range allowedRoles {
			if userRole == r {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(domain.FailureResponse(
			"FORBIDDEN",
			"Anda tidak memiliki hak akses untuk resource ini",
			nil,
		))
	}
}
