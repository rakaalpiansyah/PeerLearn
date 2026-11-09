package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"

	"peerlearn/backend/internal/domain"
)

// SecurityHeaders applies defensive HTTP headers to mitigate XSS, Clickjacking, and MIME sniffing
func SecurityHeaders() fiber.Handler {
	return helmet.New(helmet.Config{
		XSSProtection:             "1; mode=block",
		ContentTypeNosniff:        "nosniff",
		XFrameOptions:             "SAMEORIGIN",
		ReferrerPolicy:            "strict-origin-when-cross-origin",
		CrossOriginEmbedderPolicy: "unsafe-none",
		CrossOriginOpenerPolicy:   "same-origin-allow-popups",
		CrossOriginResourcePolicy: "cross-origin",
		PermissionPolicy:          "camera=(), microphone=(), geolocation=()",
	})
}

// AuthRateLimiter restricts login and registration attempts to prevent brute-force & credential stuffing
func AuthRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        12,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(domain.FailureResponse(
				"TOO_MANY_REQUESTS",
				"Terlalu banyak permintaan otentikasi. Silakan tunggu beberapa saat sebelum mencoba kembali demi keamanan akun.",
				nil,
			))
		},
	})
}

// APIRateLimiter protects public API endpoints from denial-of-service spam
func APIRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        200,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(domain.FailureResponse(
				"RATE_LIMIT_EXCEEDED",
				"Batas frekuensi akses terlampaui. Harap kurangi laju permintaan.",
				nil,
			))
		},
	})
}
