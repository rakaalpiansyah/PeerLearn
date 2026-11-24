package service_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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
		Email:      "budi@student.uinsgd.ac.id",
		Password:   "password123",
		FullName:   "Budi Mahasiswa",
		Role:       domain.RoleStudent,
		CampusName: "UIN SGD Bandung - S1 Teknik Informatika",
	}

	authResp, err := svc.Register(ctx, regReq)
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}
	if authResp.Token == "" {
		t.Errorf("Expected token to be non-empty")
	}
	if authResp.User.Email != "budi@student.uinsgd.ac.id" {
		t.Errorf("Expected email budi@student.uinsgd.ac.id, got %s", authResp.User.Email)
	}
	if authResp.User.ContributionPoints != 0 {
		t.Errorf("Expected new account contribution points to start at 0, got %d", authResp.User.ContributionPoints)
	}

	// 2. Test Register Duplicate Email
	_, err = svc.Register(ctx, regReq)
	if err != service.ErrEmailExists {
		t.Fatalf("Expected ErrEmailExists, got %v", err)
	}

	// 3. Test Login Success
	loginReq := domain.LoginRequest{
		Email:    "budi@student.uinsgd.ac.id",
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
	if claims.Email != "budi@student.uinsgd.ac.id" {
		t.Errorf("Expected token claim email budi@student.uinsgd.ac.id, got %s", claims.Email)
	}

	// 4. Test Login Wrong Password
	badReq := domain.LoginRequest{
		Email:    "budi@student.uinsgd.ac.id",
		Password: "wrongpassword",
	}
	_, err = svc.Login(ctx, badReq)
	if err != service.ErrInvalidCredentials {
		t.Fatalf("Expected ErrInvalidCredentials, got %v", err)
	}
}

func TestAuthService_LoginRejectsRemovedAdminBackdoor(t *testing.T) {
	repo := newMockUserRepository()
	svc := service.NewAuthService(repo, "test-jwt-secret-12345")
	ctx := context.Background()

	hash, err := security.HashPassword("RealStrongPassword99!")
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}
	_ = repo.Create(ctx, &domain.User{
		ID:            uuid.New(),
		Email:         "admin.fst@uinsgd.ac.id",
		PasswordHash:  hash,
		FullName:      "Admin Akademik UIN SGD",
		Role:          domain.RoleAdmin,
		AccountStatus: domain.AccountActive,
	})

	_, err = svc.Login(ctx, domain.LoginRequest{
		Email:    "admin.fst@uinsgd.ac.id",
		Password: "AdminFST2026!",
	})
	if !errors.Is(err, service.ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials for hardcoded backdoor password, got %v", err)
	}
}

func (m *mockUserRepository) UpdatePasswordHash(ctx context.Context, userID uuid.UUID, hash string) error {
	for _, u := range m.users {
		if u.ID == userID {
			u.PasswordHash = hash
			return nil
		}
	}
	return repository.ErrUserNotFound
}

func (m *mockUserRepository) MarkEmailVerified(ctx context.Context, userID uuid.UUID) error {
	now := time.Now().UTC()
	for _, u := range m.users {
		if u.ID == userID {
			u.EmailVerified = true
			u.EmailVerifiedAt = &now
			return nil
		}
	}
	return repository.ErrUserNotFound
}

type mockAuthTokenRepo struct {
	tokens []*domain.AuthToken
}

func (m *mockAuthTokenRepo) Create(ctx context.Context, token *domain.AuthToken) error {
	cp := *token
	cp.CreatedAt = time.Now().UTC()
	m.tokens = append(m.tokens, &cp)
	return nil
}

func (m *mockAuthTokenRepo) FindValidByHash(ctx context.Context, hash, purpose string) (*domain.AuthToken, error) {
	now := time.Now().UTC()
	for _, t := range m.tokens {
		if t.TokenHash == hash && t.Purpose == purpose && t.UsedAt == nil && t.ExpiresAt.After(now) {
			cp := *t
			return &cp, nil
		}
	}
	return nil, repository.ErrTokenNotFound
}

func (m *mockAuthTokenRepo) MarkUsed(ctx context.Context, id uuid.UUID) error {
	now := time.Now().UTC()
	for _, t := range m.tokens {
		if t.ID == id {
			t.UsedAt = &now
			return nil
		}
	}
	return repository.ErrTokenNotFound
}

func (m *mockAuthTokenRepo) InvalidateActiveForUser(ctx context.Context, userID uuid.UUID, purpose string) error {
	now := time.Now().UTC()
	for _, t := range m.tokens {
		if t.UserID == userID && t.Purpose == purpose && t.UsedAt == nil {
			t.UsedAt = &now
		}
	}
	return nil
}

type mockTestMailer struct {
	configured bool
	sentCount  int
}

func (m *mockTestMailer) IsConfigured() bool { return m.configured }
func (m *mockTestMailer) Send(ctx context.Context, to, subject, body string) error {
	m.sentCount++
	return nil
}

func TestAuthService_PasswordResetAndCampusEmailVerification(t *testing.T) {
	ctx := context.Background()
	userRepo := newMockUserRepository()
	tokenRepo := &mockAuthTokenRepo{}
	mail := &mockTestMailer{configured: false}
	svc := service.NewAuthService(userRepo, "test-jwt-secret-12345")
	svc.SetTokenDeps(tokenRepo, userRepo, mail, "development", "http://localhost:5173")

	campusHash, _ := security.HashPassword("oldpassword1")
	campusUser := &domain.User{
		ID:            uuid.New(),
		Email:         "nabila@student.uinsgd.ac.id",
		PasswordHash:  campusHash,
		FullName:      "Nabila UIN SGD",
		Role:          domain.RoleStudent,
		AccountStatus: domain.AccountActive,
	}
	gmailUser := &domain.User{
		ID:            uuid.New(),
		Email:         "luar@gmail.com",
		PasswordHash:  campusHash,
		FullName:      "Tamu Gmail",
		Role:          domain.RolePublic,
		AccountStatus: domain.AccountActive,
	}
	_ = userRepo.Create(ctx, campusUser)
	_ = userRepo.Create(ctx, gmailUser)

	// Non-existent email returns neutral message with empty DevToken
	unknownResp, err := svc.RequestPasswordReset(ctx, domain.ForgotPasswordRequest{Email: "missing@uinsgd.ac.id"})
	if err != nil || unknownResp.DevToken != "" {
		t.Fatalf("expected neutral response with no token for unknown user, got resp=%+v err=%v", unknownResp, err)
	}

	// Campus user forgot password creates hashed token & returns DevToken in unconfigured dev env
	resetResp, err := svc.RequestPasswordReset(ctx, domain.ForgotPasswordRequest{Email: campusUser.Email})
	if err != nil || resetResp.DevToken == "" {
		t.Fatalf("expected DevToken in development mode without SMTP, got resp=%+v err=%v", resetResp, err)
	}
	if len(tokenRepo.tokens) == 0 || tokenRepo.tokens[0].TokenHash == resetResp.DevToken {
		t.Fatal("stored token_hash must be SHA-256 hash, never raw token")
	}

	// Production env must never expose DevToken
	svc.SetTokenDeps(tokenRepo, userRepo, mail, "production", "https://peerlearn.uinsgd.ac.id")
	prodResp, err := svc.RequestPasswordReset(ctx, domain.ForgotPasswordRequest{Email: campusUser.Email})
	if err != nil || prodResp.DevToken != "" {
		t.Fatalf("production mode must suppress dev_token, got %q", prodResp.DevToken)
	}
	svc.SetTokenDeps(tokenRepo, userRepo, mail, "development", "http://localhost:5173")

	// Latest valid token resets password cleanly, and cannot be reused
	latestToken := resetResp.DevToken
	// Note: prodResp overwrote active token so let's request fresh dev token
	freshResp, err := svc.RequestPasswordReset(ctx, domain.ForgotPasswordRequest{Email: campusUser.Email})
	if err != nil || freshResp.DevToken == "" {
		t.Fatalf("fresh reset failed: %v", err)
	}
	if err := svc.ResetPassword(ctx, domain.ResetPasswordRequest{Token: latestToken, NewPassword: "newpassword9"}); !errors.Is(err, service.ErrInvalidInput) {
		t.Fatalf("expected invalidated previous token to fail, got %v", err)
	}
	if err := svc.ResetPassword(ctx, domain.ResetPasswordRequest{Token: freshResp.DevToken, NewPassword: "newpassword9"}); err != nil {
		t.Fatalf("ResetPassword failed: %v", err)
	}
	if err := svc.ResetPassword(ctx, domain.ResetPasswordRequest{Token: freshResp.DevToken, NewPassword: "anotherpass9"}); !errors.Is(err, service.ErrInvalidInput) {
		t.Fatalf("expected reused reset token rejected, got %v", err)
	}
	if _, err := svc.Login(ctx, domain.LoginRequest{Email: campusUser.Email, Password: "newpassword9"}); err != nil {
		t.Fatalf("expected login with newly reset password to succeed, got %v", err)
	}

	// Non-campus email rejected for campus email verification
	if _, err := svc.RequestEmailVerification(ctx, gmailUser.ID); !errors.Is(err, service.ErrInvalidInput) {
		t.Fatalf("expected gmail blocked from campus email badge verification, got %v", err)
	}

	// Campus user requests & confirms email verification
	verReq, err := svc.RequestEmailVerification(ctx, campusUser.ID)
	if err != nil || verReq.DevToken == "" {
		t.Fatalf("RequestEmailVerification failed: %+v err=%v", verReq, err)
	}
	confirmedUser, err := svc.ConfirmEmailVerification(ctx, domain.VerifyEmailConfirmRequest{Token: verReq.DevToken})
	if err != nil || !confirmedUser.EmailVerified || !confirmedUser.IsCampusEmail {
		t.Fatalf("expected EmailVerified=true IsCampusEmail=true, got %+v err=%v", confirmedUser, err)
	}
}
