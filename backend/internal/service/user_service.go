package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

type UserService interface {
	UpdateProfile(ctx context.Context, userID uuid.UUID, req domain.UpdateProfileRequest) (*domain.UserResponse, error)
	GetSkills(ctx context.Context) ([]domain.Skill, error)
	SyncSkills(ctx context.Context, userID uuid.UUID, req domain.UpdateSkillsRequest) error
	AddCustomSkill(ctx context.Context, userID uuid.UUID, req domain.AddCustomSkillRequest) (*domain.Skill, error)
	GetPublicProfile(ctx context.Context, targetUserID uuid.UUID) (*domain.PublicProfileResponse, error)
}

type userService struct {
	userRepo  repository.UserRepository
	skillRepo repository.SkillRepository
	groupRepo repository.GroupRepository
}

func NewUserService(
	userRepo repository.UserRepository,
	skillRepo repository.SkillRepository,
	groupRepo repository.GroupRepository,
) UserService {
	return &userService{
		userRepo:  userRepo,
		skillRepo: skillRepo,
		groupRepo: groupRepo,
	}
}

func (s *userService) UpdateProfile(ctx context.Context, userID uuid.UUID, req domain.UpdateProfileRequest) (*domain.UserResponse, error) {
	if len(req.AvatarURL) > 65536 {
		return nil, fmt.Errorf("%w: ukuran data foto melebihi batas maksimal 64KB", ErrInvalidInput)
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("userService.UpdateProfile user not found: %w", err)
	}

	if strings.TrimSpace(req.FullName) != "" {
		user.FullName = strings.TrimSpace(req.FullName)
	}
	user.CampusName = strings.TrimSpace(req.CampusName)
	if strings.TrimSpace(req.Gender) != "" {
		user.Gender = strings.TrimSpace(req.Gender)
	}
	user.Bio = strings.TrimSpace(req.Bio)
	user.AvatarURL = strings.TrimSpace(req.AvatarURL)

	if err := s.userRepo.UpdateProfile(ctx, user); err != nil {
		return nil, fmt.Errorf("userService.UpdateProfile save error: %w", err)
	}

	skills, _ := s.userRepo.GetUserSkills(ctx, userID)
	userResp := domain.ToUserResponse(user, skills)
	return &userResp, nil
}

func (s *userService) GetPublicProfile(ctx context.Context, targetUserID uuid.UUID) (*domain.PublicProfileResponse, error) {
	user, err := s.userRepo.FindByID(ctx, targetUserID)
	if err != nil {
		return nil, fmt.Errorf("userService.GetPublicProfile: %w", err)
	}

	skills, _ := s.userRepo.GetUserSkills(ctx, targetUserID)

	hostedCount := 0
	if s.groupRepo != nil {
		groups, err := s.groupRepo.ListByHost(ctx, targetUserID)
		if err == nil {
			hostedCount = len(groups)
		}
	}

	return &domain.PublicProfileResponse{
		ID:                 user.ID,
		FullName:           user.FullName,
		Role:               user.Role,
		CampusName:         user.CampusName,
		Gender:             user.Gender,
		Bio:                user.Bio,
		AvatarURL:          user.AvatarURL,
		ContributionPoints: user.ContributionPoints,
		AccountStatus:      user.AccountStatus,
		HostedGroupsCount:  hostedCount,
		Skills:             skills,
		CreatedAt:          user.CreatedAt,
	}, nil
}

func (s *userService) GetSkills(ctx context.Context) ([]domain.Skill, error) {
	skills, err := s.skillRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("userService.GetSkills: %w", err)
	}
	return skills, nil
}

func (s *userService) SyncSkills(ctx context.Context, userID uuid.UUID, req domain.UpdateSkillsRequest) error {
	var userSkills []domain.UserSkill
	for _, item := range req.Skills {
		if item.SkillID == uuid.Nil {
			continue
		}
		if item.SkillType != domain.SkillMastered && item.SkillType != domain.SkillLearning {
			item.SkillType = domain.SkillLearning
		}
		userSkills = append(userSkills, domain.UserSkill{
			UserID:    userID,
			SkillID:   item.SkillID,
			SkillType: item.SkillType,
		})
	}

	if err := s.userRepo.SyncUserSkills(ctx, userID, userSkills); err != nil {
		return fmt.Errorf("userService.SyncSkills: %w", err)
	}
	return nil
}

func (s *userService) AddCustomSkill(ctx context.Context, userID uuid.UUID, req domain.AddCustomSkillRequest) (*domain.Skill, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, fmt.Errorf("%w: nama keahlian tidak boleh kosong", ErrInvalidInput)
	}
	if req.Category == "" {
		req.Category = "Teknologi"
	}
	if req.SkillType == "" {
		req.SkillType = domain.SkillLearning
	}

	skill, err := s.skillRepo.FindOrCreate(ctx, name, req.Category)
	if err != nil {
		return nil, fmt.Errorf("userService.AddCustomSkill: %w", err)
	}

	existingSkills, err := s.userRepo.GetUserSkills(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("userService.AddCustomSkill get existing: %w", err)
	}

	var updatedSkills []domain.UserSkill
	exists := false
	for _, es := range existingSkills {
		if es.SkillID == skill.ID && es.SkillType == req.SkillType {
			exists = true
		}
		updatedSkills = append(updatedSkills, domain.UserSkill{
			UserID:    userID,
			SkillID:   es.SkillID,
			SkillType: es.SkillType,
		})
	}

	if !exists {
		updatedSkills = append(updatedSkills, domain.UserSkill{
			UserID:    userID,
			SkillID:   skill.ID,
			SkillType: req.SkillType,
		})
		if err := s.userRepo.SyncUserSkills(ctx, userID, updatedSkills); err != nil {
			return nil, fmt.Errorf("userService.AddCustomSkill sync: %w", err)
		}
	}

	return skill, nil
}
