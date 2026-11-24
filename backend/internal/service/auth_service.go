package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/mailer"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/security"
)

var (
	ErrInvalidInput       = errors.New("service: input validation failed")
	ErrEmailExists        = errors.New("service: email already registered")
	ErrInvalidCredentials = errors.New("service: invalid email or password")
)

type AuthService interface {
	SetTokenDeps(tokenRepo repository.AuthTokenRepository, userUpdater repository.UserAuthUpdater, mail mailer.Mailer, appEnv, appBaseURL string)
	Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error)
	Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error)
	GetMe(ctx context.Context, userID uuid.UUID) (*domain.UserResponse, error)
	RequestPasswordReset(ctx context.Context, req domain.ForgotPasswordRequest) (*domain.ForgotPasswordResponse, error)
	ResetPassword(ctx context.Context, req domain.ResetPasswordRequest) error
	RequestEmailVerification(ctx context.Context, userID uuid.UUID) (*domain.ForgotPasswordResponse, error)
	ConfirmEmailVerification(ctx context.Context, req domain.VerifyEmailConfirmRequest) (*domain.UserResponse, error)
}

type authService struct {
	userRepo    repository.UserRepository
	userUpdater repository.UserAuthUpdater
	tokenRepo   repository.AuthTokenRepository
	mailer      mailer.Mailer
	appEnv      string
	appBaseURL  string
	jwtSecret   string
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string) AuthService {
	var updater repository.UserAuthUpdater
	if u, ok := userRepo.(repository.UserAuthUpdater); ok {
		updater = u
	}
	return &authService{
		userRepo:    userRepo,
		userUpdater: updater,
		appEnv:      "development",
		appBaseURL:  "http://localhost:5173",
		jwtSecret:   jwtSecret,
	}
}

func (s *authService) SetTokenDeps(
	tokenRepo repository.AuthTokenRepository,
	userUpdater repository.UserAuthUpdater,
	mail mailer.Mailer,
	appEnv, appBaseURL string,
) {
	s.tokenRepo = tokenRepo
	if userUpdater != nil {
		s.userUpdater = userUpdater
	}
	s.mailer = mail
	if strings.TrimSpace(appEnv) != "" {
		s.appEnv = strings.TrimSpace(strings.ToLower(appEnv))
	}
	if strings.TrimSpace(appBaseURL) != "" {
		s.appBaseURL = strings.TrimRight(strings.TrimSpace(appBaseURL), "/")
	}
}

func (s *authService) Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FullName = strings.TrimSpace(req.FullName)

	if req.Email == "" || !strings.Contains(req.Email, "@") {
		return nil, fmt.Errorf("%w: valid email is required", ErrInvalidInput)
	}
	if len(req.Password) < 6 {
		return nil, fmt.Errorf("%w: password must be at least 6 characters", ErrInvalidInput)
	}
	if req.FullName == "" {
		return nil, fmt.Errorf("%w: full name is required", ErrInvalidInput)
	}

	switch req.Role {
	case "":
		req.Role = domain.RoleStudent
	case domain.RoleStudent, domain.RolePublic:
	default:
		return nil, fmt.Errorf("%w: pendaftaran hanya menerima peran mahasiswa atau masyarakat umum", ErrInvalidInput)
	}

	// Verify email uniqueness
	existing, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err == nil && existing != nil {
		return nil, ErrEmailExists
	}

	hashedPassword, err := security.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("authService.Register hash error: %w", err)
	}

	newUser := &domain.User{
		ID:                 uuid.New(),
		Email:              req.Email,
		PasswordHash:       hashedPassword,
		FullName:           req.FullName,
		Role:               req.Role,
		CampusName:         req.CampusName,
		Bio:                "",
		AvatarURL:          "",
		ContributionPoints: 0,
	}

	if err := s.userRepo.Create(ctx, newUser); err != nil {
		return nil, fmt.Errorf("authService.Register create error: %w", err)
	}

	token, err := security.GenerateToken(newUser.ID, newUser.Email, newUser.Role, s.jwtSecret, 7*24*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("authService.Register token error: %w", err)
	}

	userResp := domain.ToUserResponse(newUser, nil)
	return &domain.AuthResponse{
		Token: token,
		User:  userResp,
	}, nil
}

func (s *authService) Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		return nil, fmt.Errorf("%w: email and password are required", ErrInvalidInput)
	}

	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	isValidPassword := security.CheckPasswordHash(req.Password, user.PasswordHash)
	if !isValidPassword {
		return nil, ErrInvalidCredentials
	}

	if user.AccountStatus == domain.AccountSuspended {
		return nil, fmt.Errorf("%w: akun Anda sedang ditangguhkan oleh pengawas komunitas", ErrInvalidInput)
	}

	token, err := security.GenerateToken(user.ID, user.Email, user.Role, s.jwtSecret, 7*24*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("authService.Login token error: %w", err)
	}

	skills, _ := s.userRepo.GetUserSkills(ctx, user.ID)
	userResp := domain.ToUserResponse(user, skills)

	return &domain.AuthResponse{
		Token: token,
		User:  userResp,
	}, nil
}

func (s *authService) GetMe(ctx context.Context, userID uuid.UUID) (*domain.UserResponse, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("authService.GetMe user not found: %w", err)
	}

	skills, err := s.userRepo.GetUserSkills(ctx, userID)
	if err != nil {
		skills = []domain.UserSkill{}
	}

	userResp := domain.ToUserResponse(user, skills)
	return &userResp, nil
}

func generateSecureTokenPair() (rawToken string, hashHex string, err error) {
	buf := make([]byte, 16)
	if _, err = rand.Read(buf); err != nil {
		return "", "", err
	}
	rawToken = hex.EncodeToString(buf)
	hashHex = hashAuthToken(rawToken)
	return rawToken, hashHex, nil
}

func hashAuthToken(rawToken string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(rawToken)))
	return hex.EncodeToString(sum[:])
}

func (s *authService) canExposeDevToken() bool {
	if strings.EqualFold(s.appEnv, "production") {
		return false
	}
	return s.mailer == nil || !s.mailer.IsConfigured()
}

func (s *authService) RequestPasswordReset(ctx context.Context, req domain.ForgotPasswordRequest) (*domain.ForgotPasswordResponse, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		return nil, fmt.Errorf("%w: alamat email tidak valid", ErrInvalidInput)
	}

	neutral := &domain.ForgotPasswordResponse{
		Message: "Jika email terdaftar pada PeerLearn UIN SGD, instruksi atur ulang kata sandi telah dikirim.",
	}
	if s.tokenRepo == nil {
		return neutral, nil
	}

	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil || user == nil || user.AccountStatus == domain.AccountSuspended {
		return neutral, nil
	}

	rawToken, hashHex, err := generateSecureTokenPair()
	if err != nil {
		return nil, fmt.Errorf("authService.RequestPasswordReset token: %w", err)
	}

	_ = s.tokenRepo.InvalidateActiveForUser(ctx, user.ID, "password_reset")
	tok := &domain.AuthToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: hashHex,
		Purpose:   "password_reset",
		ExpiresAt: time.Now().UTC().Add(30 * time.Minute),
	}
	if err := s.tokenRepo.Create(ctx, tok); err != nil {
		return nil, fmt.Errorf("authService.RequestPasswordReset save: %w", err)
	}

	resetURL := fmt.Sprintf("%s/?reset_token=%s", s.appBaseURL, rawToken)
	body := fmt.Sprintf(
		"Halo %s,\n\nKami menerima permintaan atur ulang kata sandi akun PeerLearn UIN SGD Bandung Anda.\n"+
			"Kode token: %s\nAtau buka tautan: %s\n\nToken berlaku selama 30 menit dan hanya dapat digunakan satu kali.\n",
		user.FullName, rawToken, resetURL,
	)
	if s.mailer != nil {
		_ = s.mailer.Send(ctx, user.Email, "Atur Ulang Kata Sandi PeerLearn UIN SGD", body)
	}

	if s.canExposeDevToken() {
		neutral.DevToken = rawToken
	}
	return neutral, nil
}

func (s *authService) ResetPassword(ctx context.Context, req domain.ResetPasswordRequest) error {
	rawToken := strings.TrimSpace(req.Token)
	if rawToken == "" {
		return fmt.Errorf("%w: kode token atur ulang kata sandi wajib diisi", ErrInvalidInput)
	}
	if len(req.NewPassword) < 6 {
		return fmt.Errorf("%w: kata sandi baru minimal 6 karakter", ErrInvalidInput)
	}
	if s.tokenRepo == nil || s.userUpdater == nil {
		return fmt.Errorf("%w: layanan atur ulang kata sandi belum siap", ErrInvalidInput)
	}

	tok, err := s.tokenRepo.FindValidByHash(ctx, hashAuthToken(rawToken), "password_reset")
	if err != nil || tok == nil {
		return fmt.Errorf("%w: kode token tidak valid atau telah kedaluwarsa", ErrInvalidInput)
	}

	hashedPassword, err := security.HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("authService.ResetPassword hash: %w", err)
	}

	if err := s.userUpdater.UpdatePasswordHash(ctx, tok.UserID, hashedPassword); err != nil {
		return fmt.Errorf("authService.ResetPassword update: %w", err)
	}
	_ = s.tokenRepo.MarkUsed(ctx, tok.ID)
	return nil
}

func (s *authService) RequestEmailVerification(ctx context.Context, userID uuid.UUID) (*domain.ForgotPasswordResponse, error) {
	if s.tokenRepo == nil {
		return nil, fmt.Errorf("%w: layanan verifikasi email belum siap", ErrInvalidInput)
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return nil, fmt.Errorf("%w: pengguna tidak ditemukan", ErrInvalidInput)
	}
	if user.EmailVerified {
		return &domain.ForgotPasswordResponse{
			Message: "Email kampus Anda sudah berstatus terverifikasi.",
		}, nil
	}
	if !domain.IsCampusEmail(user.Email) {
		return nil, fmt.Errorf("%w: verifikasi lencana kampus hanya tersedia untuk email @uinsgd.ac.id atau @student.uinsgd.ac.id", ErrInvalidInput)
	}

	rawToken, hashHex, err := generateSecureTokenPair()
	if err != nil {
		return nil, fmt.Errorf("authService.RequestEmailVerification token: %w", err)
	}

	_ = s.tokenRepo.InvalidateActiveForUser(ctx, user.ID, "email_verify")
	tok := &domain.AuthToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: hashHex,
		Purpose:   "email_verify",
		ExpiresAt: time.Now().UTC().Add(24 * time.Hour),
	}
	if err := s.tokenRepo.Create(ctx, tok); err != nil {
		return nil, fmt.Errorf("authService.RequestEmailVerification save: %w", err)
	}

	verifyURL := fmt.Sprintf("%s/?verify_token=%s", s.appBaseURL, rawToken)
	body := fmt.Sprintf(
		"Halo %s,\n\nGunakan kode verifikasi ini untuk mengaktifkan lencana Email Kampus Terverifikasi di PeerLearn UIN SGD:\n"+
			"Kode verifikasi: %s\nAtau buka: %s\n\nBerlaku selama 24 jam.\n",
		user.FullName, rawToken, verifyURL,
	)
	if s.mailer != nil {
		_ = s.mailer.Send(ctx, user.Email, "Verifikasi Email Kampus PeerLearn UIN SGD", body)
	}

	resp := &domain.ForgotPasswordResponse{
		Message: fmt.Sprintf("Kode verifikasi telah dikirim ke %s.", user.Email),
	}
	if s.canExposeDevToken() {
		resp.DevToken = rawToken
	}
	return resp, nil
}

func (s *authService) ConfirmEmailVerification(ctx context.Context, req domain.VerifyEmailConfirmRequest) (*domain.UserResponse, error) {
	rawToken := strings.TrimSpace(req.Token)
	if rawToken == "" {
		return nil, fmt.Errorf("%w: kode verifikasi email wajib diisi", ErrInvalidInput)
	}
	if s.tokenRepo == nil || s.userUpdater == nil {
		return nil, fmt.Errorf("%w: layanan verifikasi email belum siap", ErrInvalidInput)
	}

	tok, err := s.tokenRepo.FindValidByHash(ctx, hashAuthToken(rawToken), "email_verify")
	if err != nil || tok == nil {
		return nil, fmt.Errorf("%w: kode verifikasi tidak valid atau telah kedaluwarsa", ErrInvalidInput)
	}

	if err := s.userUpdater.MarkEmailVerified(ctx, tok.UserID); err != nil {
		return nil, fmt.Errorf("authService.ConfirmEmailVerification update: %w", err)
	}
	_ = s.tokenRepo.MarkUsed(ctx, tok.ID)

	user, err := s.userRepo.FindByID(ctx, tok.UserID)
	if err != nil {
		return nil, fmt.Errorf("authService.ConfirmEmailVerification fetch: %w", err)
	}
	skills, _ := s.userRepo.GetUserSkills(ctx, user.ID)
	resp := domain.ToUserResponse(user, skills)
	return &resp, nil
}
