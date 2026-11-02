package service_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

type mockSkillRepository struct {
	skills []domain.Skill
}

func (m *mockSkillRepository) GetAll(ctx context.Context) ([]domain.Skill, error) {
	return m.skills, nil
}

func (m *mockSkillRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Skill, error) {
	for _, s := range m.skills {
		if s.ID == id {
			return &s, nil
		}
	}
	return nil, nil
}

func (m *mockSkillRepository) FindOrCreate(ctx context.Context, name, category string) (*domain.Skill, error) {
	for _, s := range m.skills {
		if s.Name == name {
			return &s, nil
		}
	}
	newSkill := domain.Skill{
		ID:        uuid.New(),
		Name:      name,
		Category:  category,
		CreatedAt: time.Now(),
	}
	m.skills = append(m.skills, newSkill)
	return &newSkill, nil
}

type mockGroupRepoForUser struct {
	hostedCount int
}

func (m *mockGroupRepoForUser) Create(ctx context.Context, group *domain.LearningGroup) error {
	return nil
}

func (m *mockGroupRepoForUser) FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupResponse, error) {
	return nil, nil
}

func (m *mockGroupRepoForUser) List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error) {
	return nil, nil
}

func (m *mockGroupRepoForUser) Update(ctx context.Context, group *domain.LearningGroup) error {
	return nil
}

func (m *mockGroupRepoForUser) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.GroupStatus) error {
	return nil
}

func (m *mockGroupRepoForUser) ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error) {
	var list []domain.GroupResponse
	for i := 0; i < m.hostedCount; i++ {
		list = append(list, domain.GroupResponse{ID: uuid.New(), HostID: hostID})
	}
	return list, nil
}

func (m *mockGroupRepoForUser) FindRecommendations(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error) {
	return nil, nil
}

func (m *mockGroupRepoForUser) CancelByHost(ctx context.Context, hostID uuid.UUID) error {
	return nil
}

func TestUserService_UpdateProfile_GenderAndAvatar(t *testing.T) {
	userRepo := newMockUserRepository()
	skillRepo := &mockSkillRepository{}
	groupRepo := &mockGroupRepoForUser{hostedCount: 3}
	userService := service.NewUserService(userRepo, skillRepo, groupRepo)

	userID := uuid.New()
	user := &domain.User{
		ID:            userID,
		Email:         "fatimah@uinsgd.ac.id",
		FullName:      "Siti Fatimah",
		Role:          domain.RoleStudent,
		CampusName:    "UIN SGD Bandung - S1 Teknik Informatika",
		Gender:        "Perempuan",
		AccountStatus: domain.AccountActive,
		CreatedAt:     time.Now(),
	}
	_ = userRepo.Create(context.Background(), user)

	compressedAvatar := "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoEAAQAPoU8l0el"
	req := domain.UpdateProfileRequest{
		FullName:   "Siti Fatimah Azzahra",
		CampusName: "UIN SGD Bandung - S1 Teknik Informatika",
		Gender:     "Perempuan",
		Bio:        "Tertarik pada komputasi awan dan algoritma.",
		AvatarURL:  compressedAvatar,
	}

	resp, err := userService.UpdateProfile(context.Background(), userID, req)
	if err != nil {
		t.Fatalf("expected successful update, got: %v", err)
	}

	if resp.Gender != "Perempuan" {
		t.Errorf("expected gender 'Perempuan', got '%s'", resp.Gender)
	}
	if resp.AvatarURL != compressedAvatar {
		t.Errorf("expected avatar_url to be updated")
	}
	if resp.FullName != "Siti Fatimah Azzahra" {
		t.Errorf("expected updated full name, got '%s'", resp.FullName)
	}
}

func TestUserService_UpdateProfile_RejectsOversizedAvatar(t *testing.T) {
	userRepo := newMockUserRepository()
	skillRepo := &mockSkillRepository{}
	groupRepo := &mockGroupRepoForUser{}
	userService := service.NewUserService(userRepo, skillRepo, groupRepo)

	userID := uuid.New()
	user := &domain.User{
		ID:        userID,
		Email:     "user@uinsgd.ac.id",
		FullName:  "User Test",
		Role:      domain.RoleStudent,
		CreatedAt: time.Now(),
	}
	_ = userRepo.Create(context.Background(), user)

	oversizedAvatar := "data:image/jpeg;base64," + strings.Repeat("A", 66000)
	req := domain.UpdateProfileRequest{
		AvatarURL: oversizedAvatar,
	}

	_, err := userService.UpdateProfile(context.Background(), userID, req)
	if err == nil {
		t.Fatalf("expected error for avatar exceeding 65536 bytes, got nil")
	}
}

func TestUserService_GetPublicProfile(t *testing.T) {
	userRepo := newMockUserRepository()
	skillRepo := &mockSkillRepository{}
	groupRepo := &mockGroupRepoForUser{hostedCount: 5}
	userService := service.NewUserService(userRepo, skillRepo, groupRepo)

	userID := uuid.New()
	user := &domain.User{
		ID:                 userID,
		Email:              "private@uinsgd.ac.id",
		FullName:           "Raka Pratama",
		Role:               domain.RoleStudent,
		CampusName:         "UIN SGD Bandung - S1 Teknik Elektro",
		Gender:             "Laki-laki",
		Bio:                "Asisten Lab Sistem Tertanam",
		ContributionPoints: 45,
		AccountStatus:      domain.AccountActive,
		CreatedAt:          time.Now(),
	}
	_ = userRepo.Create(context.Background(), user)

	skillID := uuid.New()
	_ = userRepo.SyncUserSkills(context.Background(), userID, []domain.UserSkill{
		{
			UserID:    userID,
			SkillID:   skillID,
			SkillType: domain.SkillMastered,
			Skill: &domain.Skill{
				ID:       skillID,
				Name:     "Rangkaian Listrik",
				Category: "Teknik Elektro",
			},
		},
	})

	pub, err := userService.GetPublicProfile(context.Background(), userID)
	if err != nil {
		t.Fatalf("expected success, got: %v", err)
	}

	if pub.FullName != "Raka Pratama" {
		t.Errorf("expected full name 'Raka Pratama', got '%s'", pub.FullName)
	}
	if pub.Gender != "Laki-laki" {
		t.Errorf("expected gender 'Laki-laki', got '%s'", pub.Gender)
	}
	if pub.ContributionPoints != 45 {
		t.Errorf("expected 45 points, got %d", pub.ContributionPoints)
	}
	if pub.HostedGroupsCount != 5 {
		t.Errorf("expected 5 hosted groups, got %d", pub.HostedGroupsCount)
	}
	if len(pub.Skills) != 1 || pub.Skills[0].Skill.Name != "Rangkaian Listrik" {
		t.Errorf("expected 1 mastered skill 'Rangkaian Listrik'")
	}
}
