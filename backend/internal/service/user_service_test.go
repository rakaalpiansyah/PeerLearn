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
	hostedCount  int
	hostedGroups []domain.GroupResponse
	byID         map[uuid.UUID]*domain.GroupResponse
}

func (m *mockGroupRepoForUser) Create(ctx context.Context, group *domain.LearningGroup) error {
	return nil
}

func (m *mockGroupRepoForUser) FindByID(ctx context.Context, id uuid.UUID) (*domain.GroupResponse, error) {
	if m.byID != nil {
		if g, ok := m.byID[id]; ok {
			cp := *g
			return &cp, nil
		}
	}
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

func (m *mockGroupRepoForUser) ReviewGroup(ctx context.Context, id uuid.UUID, adminID uuid.UUID, status domain.GroupStatus, note string) error {
	return nil
}

func (m *mockGroupRepoForUser) ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error) {
	if m.hostedGroups != nil {
		return m.hostedGroups, nil
	}
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

func TestUserService_GetSKPIVerification(t *testing.T) {
	ctx := context.Background()
	userRepo := newMockUserRepository()
	skillRepo := &mockSkillRepository{}
	memRepo := newFullMockMembershipRepo()

	userID := uuid.New()
	hostedCompletedID := uuid.New()
	hostedOpenID := uuid.New()
	joinedAttendedID := uuid.New()

	_ = userRepo.Create(ctx, &domain.User{
		ID:                 userID,
		Email:              "rahasia@student.uinsgd.ac.id",
		FullName:           "Nabila Azzahra",
		Role:               domain.RoleStudent,
		CampusName:         "UIN SGD Bandung - S1 Teknik Informatika",
		ContributionPoints: 42,
		AccountStatus:      domain.AccountActive,
	})
	skillID := uuid.New()
	_ = userRepo.SyncUserSkills(ctx, userID, []domain.UserSkill{
		{
			UserID:    userID,
			SkillID:   skillID,
			SkillType: domain.SkillMastered,
			Skill:     &domain.Skill{ID: skillID, Name: "Basis Data PostgreSQL", Category: "Teknologi"},
		},
	})

	groupRepo := &mockGroupRepoForUser{
		hostedGroups: []domain.GroupResponse{
			{
				ID:            hostedCompletedID,
				HostID:        userID,
				Title:         "Responsi Struktur Data",
				Category:      "Teknologi",
				Status:        domain.StatusCompleted,
				StartTime:     time.Now().Add(-48 * time.Hour),
				AttendedCount: 4,
			},
			{
				ID:        hostedOpenID,
				HostID:    userID,
				Title:     "Sesi Belum Selesai",
				Category:  "Teknologi",
				Status:    domain.StatusOpen,
				StartTime: time.Now().Add(24 * time.Hour),
			},
		},
		byID: map[uuid.UUID]*domain.GroupResponse{
			joinedAttendedID: {
				ID:        joinedAttendedID,
				HostID:    uuid.New(),
				Title:     "Kajian Fiqh Muamalah",
				Category:  "Hukum & Syariah",
				Status:    domain.StatusCompleted,
				StartTime: time.Now().Add(-72 * time.Hour),
			},
		},
	}

	_ = memRepo.Create(ctx, &domain.Membership{
		ID:      uuid.New(),
		GroupID: joinedAttendedID,
		UserID:  userID,
		Status:  domain.MembershipAttended,
	})

	svc := service.NewUserService(userRepo, skillRepo, groupRepo, memRepo)

	res, err := svc.GetSKPIVerification(ctx, userID)
	if err != nil {
		t.Fatalf("expected GetSKPIVerification success, got: %v", err)
	}
	if res.FullName != "Nabila Azzahra" || !res.Verified {
		t.Errorf("unexpected verification header: %+v", res)
	}
	if res.VerifiedHostedCount != 1 || res.VerifiedAttendedCount != 1 {
		t.Errorf("expected 1 hosted completed and 1 attended joined, got hosted=%d attended=%d", res.VerifiedHostedCount, res.VerifiedAttendedCount)
	}
	if len(res.CompletedSessions) != 2 {
		t.Fatalf("expected 2 completed sessions in transcript, got %d", len(res.CompletedSessions))
	}
	if len(res.MasteredSkills) != 1 || res.MasteredSkills[0] != "Basis Data PostgreSQL" {
		t.Errorf("expected mastered skill Basis Data PostgreSQL, got %+v", res.MasteredSkills)
	}
	if !strings.HasPrefix(res.VerificationCode, "PL-") {
		t.Errorf("expected PL- prefix on verification code, got %s", res.VerificationCode)
	}

	if _, err := svc.GetSKPIVerification(ctx, uuid.New()); err == nil {
		t.Fatalf("expected error for unknown user ID, got nil")
	}
}
