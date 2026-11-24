package service

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

type UserService interface {
	SetCoHostRepo(repo repository.GroupCoHostRepository)
	SetUserSearcher(searcher repository.UserSearcher)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req domain.UpdateProfileRequest) (*domain.UserResponse, error)
	GetSkills(ctx context.Context) ([]domain.Skill, error)
	SyncSkills(ctx context.Context, userID uuid.UUID, req domain.UpdateSkillsRequest) error
	AddCustomSkill(ctx context.Context, userID uuid.UUID, req domain.AddCustomSkillRequest) (*domain.Skill, error)
	GetPublicProfile(ctx context.Context, targetUserID uuid.UUID) (*domain.PublicProfileResponse, error)
	GetSKPIVerification(ctx context.Context, targetUserID uuid.UUID) (*domain.SKPIVerificationResponse, error)
	SearchUsers(ctx context.Context, callerID uuid.UUID, query string) ([]domain.UserSearchItem, error)
}

type userService struct {
	userRepo       repository.UserRepository
	userSearcher   repository.UserSearcher
	skillRepo      repository.SkillRepository
	groupRepo      repository.GroupRepository
	membershipRepo repository.MembershipRepository
	coHostRepo     repository.GroupCoHostRepository
}

func (s *userService) SetCoHostRepo(repo repository.GroupCoHostRepository) {
	s.coHostRepo = repo
}

func (s *userService) SetUserSearcher(searcher repository.UserSearcher) {
	s.userSearcher = searcher
}

func NewUserService(
	userRepo repository.UserRepository,
	skillRepo repository.SkillRepository,
	groupRepo repository.GroupRepository,
	membershipRepo ...repository.MembershipRepository,
) UserService {
	var mRepo repository.MembershipRepository
	if len(membershipRepo) > 0 {
		mRepo = membershipRepo[0]
	}
	var searcher repository.UserSearcher
	if s, ok := userRepo.(repository.UserSearcher); ok {
		searcher = s
	}
	return &userService{
		userRepo:       userRepo,
		userSearcher:   searcher,
		skillRepo:      skillRepo,
		groupRepo:      groupRepo,
		membershipRepo: mRepo,
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

func (s *userService) GetSKPIVerification(ctx context.Context, targetUserID uuid.UUID) (*domain.SKPIVerificationResponse, error) {
	user, err := s.userRepo.FindByID(ctx, targetUserID)
	if err != nil {
		return nil, fmt.Errorf("userService.GetSKPIVerification: %w", err)
	}

	userSkills, _ := s.userRepo.GetUserSkills(ctx, targetUserID)
	masteredSkills := make([]string, 0)
	for _, us := range userSkills {
		if us.SkillType == domain.SkillMastered && us.Skill != nil && us.Skill.Name != "" {
			masteredSkills = append(masteredSkills, us.Skill.Name)
		}
	}

	completedSessions := make([]domain.SKPISessionRecord, 0)
	verifiedHostedCount := 0
	verifiedAttendedCount := 0
	seenHostedGroupIDs := make(map[uuid.UUID]bool)

	if s.groupRepo != nil {
		hostedGroups, err := s.groupRepo.ListByHost(ctx, targetUserID)
		if err == nil {
			for _, g := range hostedGroups {
				if g.Status != domain.StatusCompleted {
					continue
				}
				seenHostedGroupIDs[g.ID] = true
				verifiedHostedCount++
				completedSessions = append(completedSessions, domain.SKPISessionRecord{
					GroupID:       g.ID,
					Title:         g.Title,
					Category:      g.Category,
					Role:          "tutor",
					StartTime:     g.StartTime,
					AttendedCount: g.AttendedCount,
				})
			}
		}
	}

	if s.coHostRepo != nil && s.groupRepo != nil {
		coHostedIDs, err := s.coHostRepo.ListGroupIDsByUser(ctx, targetUserID)
		if err == nil {
			for _, gid := range coHostedIDs {
				if seenHostedGroupIDs[gid] {
					continue
				}
				g, gErr := s.groupRepo.FindByID(ctx, gid)
				if gErr != nil || g == nil || g.Status != domain.StatusCompleted {
					continue
				}
				seenHostedGroupIDs[gid] = true
				verifiedHostedCount++
				completedSessions = append(completedSessions, domain.SKPISessionRecord{
					GroupID:       g.ID,
					Title:         g.Title,
					Category:      g.Category,
					Role:          "co_tutor",
					StartTime:     g.StartTime,
					AttendedCount: g.AttendedCount,
				})
			}
		}
	}

	if s.membershipRepo != nil && s.groupRepo != nil {
		memberships, err := s.membershipRepo.ListByUser(ctx, targetUserID)
		if err == nil {
			for _, m := range memberships {
				if m.Status != domain.MembershipAttended {
					continue
				}
				g, gErr := s.groupRepo.FindByID(ctx, m.GroupID)
				if gErr != nil || g == nil {
					continue
				}
				verifiedAttendedCount++
				completedSessions = append(completedSessions, domain.SKPISessionRecord{
					GroupID:       g.ID,
					Title:         g.Title,
					Category:      g.Category,
					Role:          "participant",
					StartTime:     g.StartTime,
					AttendedCount: g.AttendedCount,
				})
			}
		}
	}

	sort.Slice(completedSessions, func(i, j int) bool {
		return completedSessions[i].StartTime.After(completedSessions[j].StartTime)
	})

	verificationCode := fmt.Sprintf("PL-%s", strings.ToUpper(strings.ReplaceAll(user.ID.String(), "-", "")))
	verified := user.ContributionPoints > 0 || len(completedSessions) > 0

	return &domain.SKPIVerificationResponse{
		UserID:                user.ID,
		FullName:              user.FullName,
		CampusName:            user.CampusName,
		ContributionPoints:    user.ContributionPoints,
		MasteredSkills:        masteredSkills,
		VerifiedHostedCount:   verifiedHostedCount,
		VerifiedAttendedCount: verifiedAttendedCount,
		CompletedSessions:     completedSessions,
		VerificationCode:      verificationCode,
		Verified:              verified,
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

func (s *userService) SearchUsers(ctx context.Context, callerID uuid.UUID, query string) ([]domain.UserSearchItem, error) {
	trimmed := strings.TrimSpace(query)
	if len(trimmed) < 2 {
		return []domain.UserSearchItem{}, nil
	}
	if s.userSearcher == nil {
		return []domain.UserSearchItem{}, nil
	}
	users, err := s.userSearcher.SearchUsers(ctx, trimmed, 8)
	if err != nil {
		return nil, fmt.Errorf("userService.SearchUsers: %w", err)
	}
	items := make([]domain.UserSearchItem, 0, len(users))
	for _, u := range users {
		if u.ID == callerID {
			continue
		}
		items = append(items, domain.UserSearchItem{
			ID:         u.ID,
			FullName:   u.FullName,
			CampusName: u.CampusName,
			AvatarURL:  u.AvatarURL,
			Role:       u.Role,
		})
	}
	return items, nil
}
