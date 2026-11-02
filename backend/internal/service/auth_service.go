package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/security"
)

var (
	ErrInvalidInput       = errors.New("service: input validation failed")
	ErrEmailExists        = errors.New("service: email already registered")
	ErrInvalidCredentials = errors.New("service: invalid email or password")
)

type AuthService interface {
	Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error)
	Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error)
	GetMe(ctx context.Context, userID uuid.UUID) (*domain.UserResponse, error)
}

type authService struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string) AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
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
		ContributionPoints: 10,
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

	if !security.CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, ErrInvalidCredentials
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
