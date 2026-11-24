package middleware_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/middleware"
	"peerlearn/backend/internal/security"
)

func TestOptionalJWTMiddleware(t *testing.T) {
	secret := "test-optional-jwt-secret"
	app := fiber.New(fiber.Config{DisableStartupMessage: true})
	app.Get("/check", middleware.OptionalJWTMiddleware(secret), func(c *fiber.Ctx) error {
		uid, _ := c.Locals("userID").(uuid.UUID)
		role, _ := c.Locals("role").(domain.UserRole)
		return c.JSON(fiber.Map{
			"hasUser": uid != uuid.Nil,
			"role":    role,
		})
	})

	decode := func(resp *http.Response) (bool, string) {
		defer func() { _ = resp.Body.Close() }()
		var out struct {
			HasUser bool   `json:"hasUser"`
			Role    string `json:"role"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
			t.Fatalf("decode response failed: %v", err)
		}
		return out.HasUser, out.Role
	}

	// 1. Guest without token passes through with no user
	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/check", nil))
	if err != nil {
		t.Fatalf("guest request failed: %v", err)
	}
	hasUser, role := decode(resp)
	if hasUser || role != "" {
		t.Errorf("expected guest hasUser=false role='', got hasUser=%v role=%q", hasUser, role)
	}

	// 2. Invalid token does not block public endpoint or attach user
	badReq := httptest.NewRequest(http.MethodGet, "/check", nil)
	badReq.Header.Set("Authorization", "Bearer invalid.token.value")
	badResp, err := app.Test(badReq)
	if err != nil {
		t.Fatalf("invalid-token request failed: %v", err)
	}
	hasUser, role = decode(badResp)
	if hasUser || role != "" {
		t.Errorf("expected invalid token hasUser=false role='', got hasUser=%v role=%q", hasUser, role)
	}

	// 3. Valid token populates locals
	uid := uuid.New()
	tok, err := security.GenerateToken(uid, "mahasiswa@student.uinsgd.ac.id", domain.RoleStudent, secret, time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}
	authReq := httptest.NewRequest(http.MethodGet, "/check", nil)
	authReq.Header.Set("Authorization", "Bearer "+tok)
	authResp, err := app.Test(authReq)
	if err != nil {
		t.Fatalf("authenticated request failed: %v", err)
	}
	hasUser, role = decode(authResp)
	if !hasUser || role != string(domain.RoleStudent) {
		t.Errorf("expected valid token hasUser=true role='student', got hasUser=%v role=%q", hasUser, role)
	}
}
