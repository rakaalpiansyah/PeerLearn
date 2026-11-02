package service_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/handler"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/security"
	"peerlearn/backend/internal/service"
)

type mockUserRepository struct {
	users      map[string]*domain.User
	userSkills map[uuid.UUID][]domain.UserSkill
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users:      make(map[string]*domain.User),
		userSkills: make(map[uuid.UUID][]domain.UserSkill),
	}
}

func (m *mockUserRepository) Create(ctx context.Context, user *domain.User) error {
	if _, exists := m.users[user.Email]; exists {
		return repository.ErrUserAlreadyExists
	}
	m.users[user.Email] = user
	return nil
}

func (m *mockUserRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	u, ok := m.users[email]
	if !ok {
		return nil, repository.ErrUserNotFound
	}
	return u, nil
}

func (m *mockUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, repository.ErrUserNotFound
}

func (m *mockUserRepository) UpdateProfile(ctx context.Context, user *domain.User) error {
	m.users[user.Email] = user
	return nil
}

func (m *mockUserRepository) UpdateAccountStatus(ctx context.Context, id uuid.UUID, status domain.AccountStatus, note string) error {
	for _, u := range m.users {
		if u.ID == id {
			u.AccountStatus = status
			u.RestrictionNote = note
			return nil
		}
	}
	return repository.ErrUserNotFound
}

func (m *mockUserRepository) GetUserSkills(ctx context.Context, userID uuid.UUID) ([]domain.UserSkill, error) {
	return m.userSkills[userID], nil
}

func (m *mockUserRepository) SyncUserSkills(ctx context.Context, userID uuid.UUID, skills []domain.UserSkill) error {
	m.userSkills[userID] = skills
	return nil
}

func TestAuthService_RegisterRejectsNonPublicRoles(t *testing.T) {
	for _, role := range []domain.UserRole{domain.RoleAdmin, "moderator", "ADMIN", " student "} {
		t.Run(string(role), func(t *testing.T) {
			repo := newMockUserRepository()
			svc := service.NewAuthService(repo, "test-jwt-secret-12345")
			resp, err := svc.Register(context.Background(), domain.RegisterRequest{
				Email: "registrant@example.com", Password: "password123",
				FullName: "Pendaftar", Role: role,
			})

			if !errors.Is(err, service.ErrInvalidInput) {
				t.Errorf("expected ErrInvalidInput for role %q, got %v", role, err)
			}
			if resp != nil {
				t.Error("rejected registration must not return a user or token")
			}
			if len(repo.users) != 0 {
				t.Error("rejected registration must not persist an account")
			}
		})
	}
}

func TestAuthService_RegisterPermittedRoles(t *testing.T) {
	for _, tc := range []struct {
		name string
		role domain.UserRole
		want domain.UserRole
	}{
		{name: "default student", role: "", want: domain.RoleStudent},
		{name: "student", role: domain.RoleStudent, want: domain.RoleStudent},
		{name: "public", role: domain.RolePublic, want: domain.RolePublic},
	} {
		t.Run(tc.name, func(t *testing.T) {
			repo := newMockUserRepository()
			secret := "test-jwt-secret-12345"
			svc := service.NewAuthService(repo, secret)
			resp, err := svc.Register(context.Background(), domain.RegisterRequest{
				Email: "registrant@example.com", Password: "password123",
				FullName: "Pendaftar", Role: tc.role,
			})
			if err != nil {
				t.Fatalf("Register failed: %v", err)
			}
			if resp.User.Role != tc.want {
				t.Errorf("response role = %q, want %q", resp.User.Role, tc.want)
			}
			stored, err := repo.FindByEmail(context.Background(), "registrant@example.com")
			if err != nil {
				t.Fatalf("registered account missing: %v", err)
			}
			if stored.Role != tc.want {
				t.Errorf("stored role = %q, want %q", stored.Role, tc.want)
			}
			claims, err := security.ValidateToken(resp.Token, secret)
			if err != nil {
				t.Fatalf("invalid registration token: %v", err)
			}
			if claims.Role != tc.want {
				t.Errorf("token role = %q, want %q", claims.Role, tc.want)
			}
		})
	}
}

func TestAuthHandler_RegisterRejectsAdminRole(t *testing.T) {
	repo := newMockUserRepository()
	svc := service.NewAuthService(repo, "test-jwt-secret-12345")
	app := fiber.New()
	app.Post("/api/v1/auth/register", handler.NewAuthHandler(svc).Register)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(
		`{"email":"registrant@example.com","password":"password123","full_name":"Pendaftar","role":"admin"}`,
	))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("registration request failed: %v", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			t.Errorf("close response body: %v", err)
		}
	}()
	if resp.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusUnprocessableEntity)
	}
	if len(repo.users) != 0 {
		t.Error("HTTP registration must not create an admin account")
	}
}

func TestAuthService_RegisterAndLogin(t *testing.T) {
	repo := newMockUserRepository()
	jwtSecret := "test-jwt-secret-12345"
	svc := service.NewAuthService(repo, jwtSecret)
	ctx := context.Background()

	// 1. Test Register Success
	regReq := domain.RegisterRequest{
		Email:      "budi@kampus.ac.id",
		Password:   "password123",
		FullName:   "Budi Mahasiswa",
		Role:       domain.RoleStudent,
		CampusName: "Universitas Indonesia",
	}

	authResp, err := svc.Register(ctx, regReq)
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}
	if authResp.Token == "" {
		t.Errorf("Expected token to be non-empty")
	}
	if authResp.User.Email != "budi@kampus.ac.id" {
		t.Errorf("Expected email budi@kampus.ac.id, got %s", authResp.User.Email)
	}

	// 2. Test Register Duplicate Email
	_, err = svc.Register(ctx, regReq)
	if err != service.ErrEmailExists {
		t.Fatalf("Expected ErrEmailExists, got %v", err)
	}

	// 3. Test Login Success
	loginReq := domain.LoginRequest{
		Email:    "budi@kampus.ac.id",
		Password: "password123",
	}
	loginResp, err := svc.Login(ctx, loginReq)
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if loginResp.Token == "" {
		t.Errorf("Expected non-empty login token")
	}

	// Validate JWT Token structure
	claims, err := security.ValidateToken(loginResp.Token, jwtSecret)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if claims.Email != "budi@kampus.ac.id" {
		t.Errorf("Expected token claim email budi@kampus.ac.id, got %s", claims.Email)
	}

	// 4. Test Login Wrong Password
	badReq := domain.LoginRequest{
		Email:    "budi@kampus.ac.id",
		Password: "wrongpassword",
	}
	_, err = svc.Login(ctx, badReq)
	if err != service.ErrInvalidCredentials {
		t.Fatalf("Expected ErrInvalidCredentials, got %v", err)
	}
}
