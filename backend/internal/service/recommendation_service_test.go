package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/service"
)

func TestGroupService_RecommendationEngineV2(t *testing.T) {
	ctx := context.Background()
	now := time.Now().UTC()

	t.Run("ranks exact skill match above category and prodi match and sanitizes private fields", func(t *testing.T) {
		groupRepo := newMockGroupRepository()
		userRepo := newMockUserRepository()
		memRepo := newFullMockMembershipRepo()

		learnerID := uuid.New()
		hostExactID := uuid.New()
		hostCatID := uuid.New()
		hostProdiID := uuid.New()
		hostUnrelatedID := uuid.New()

		skillDB := &domain.Skill{ID: uuid.New(), Name: "Basis Data PostgreSQL", Category: "Teknologi"}

		_ = userRepo.Create(ctx, &domain.User{
			ID:         learnerID,
			Email:      "learner@student.uinsgd.ac.id",
			FullName:   "Andi",
			Role:       domain.RoleStudent,
			CampusName: "UIN SGD Bandung - S1 Teknik Informatika",
		})
		_ = userRepo.Create(ctx, &domain.User{
			ID:                 hostExactID,
			Email:              "secret.host@student.uinsgd.ac.id",
			FullName:           "Tutor Exact",
			Role:               domain.RoleStudent,
			ContributionPoints: 25,
		})
		_ = userRepo.Create(ctx, &domain.User{
			ID:                 hostCatID,
			Email:              "cat@student.uinsgd.ac.id",
			FullName:           "Tutor Kategori",
			Role:               domain.RoleStudent,
			ContributionPoints: 10,
		})
		_ = userRepo.Create(ctx, &domain.User{
			ID:                 hostProdiID,
			Email:              "prodi@student.uinsgd.ac.id",
			FullName:           "Tutor Prodi",
			Role:               domain.RoleStudent,
			ContributionPoints: 20,
		})
		_ = userRepo.Create(ctx, &domain.User{
			ID:       hostUnrelatedID,
			Email:    "unrelated@student.uinsgd.ac.id",
			FullName: "Tutor Biologi",
			Role:     domain.RoleStudent,
		})

		_ = userRepo.SyncUserSkills(ctx, learnerID, []domain.UserSkill{
			{UserID: learnerID, SkillID: skillDB.ID, SkillType: domain.SkillLearning, Skill: skillDB},
		})
		_ = userRepo.SyncUserSkills(ctx, hostExactID, []domain.UserSkill{
			{UserID: hostExactID, SkillID: skillDB.ID, SkillType: domain.SkillMastered, Skill: skillDB},
		})

		exactGroupID := uuid.New()
		catGroupID := uuid.New()
		prodiGroupID := uuid.New()
		unrelatedGroupID := uuid.New()

		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID:             exactGroupID,
			HostID:         hostExactID,
			Title:          "Optimasi Query Basis Data",
			Description:    "Tuning index PostgreSQL",
			Category:       "Teknologi",
			Format:         domain.FormatOnline,
			LocationOrLink: "https://meet.google.com/private-exact",
			Agenda:         []string{"Index B-Tree", "EXPLAIN ANALYZE"},
			StartTime:      now.Add(24 * time.Hour),
			EndTime:        now.Add(26 * time.Hour),
			MaxCapacity:    10,
			Status:         domain.StatusOpen,
			Host: &domain.User{
				ID: hostExactID, Email: "secret.host@student.uinsgd.ac.id", FullName: "Tutor Exact", ContributionPoints: 25,
			},
		})
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID:             catGroupID,
			HostID:         hostCatID,
			Title:          "Pengenalan Jaringan Komputer",
			Category:       "Teknologi",
			Format:         domain.FormatOnline,
			LocationOrLink: "https://meet.google.com/private-cat",
			StartTime:      now.Add(48 * time.Hour),
			EndTime:        now.Add(50 * time.Hour),
			MaxCapacity:    10,
			Status:         domain.StatusOpen,
			Host: &domain.User{
				ID: hostCatID, Email: "cat@student.uinsgd.ac.id", FullName: "Tutor Kategori", ContributionPoints: 10,
			},
		})
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID:             prodiGroupID,
			HostID:         hostProdiID,
			Title:          "Eksplorasi Visualisasi Data Python",
			Category:       "Sains Data",
			Format:         domain.FormatOnline,
			LocationOrLink: "https://meet.google.com/private-prodi",
			StartTime:      now.Add(72 * time.Hour),
			EndTime:        now.Add(74 * time.Hour),
			MaxCapacity:    10,
			Status:         domain.StatusOpen,
			Host: &domain.User{
				ID: hostProdiID, Email: "prodi@student.uinsgd.ac.id", FullName: "Tutor Prodi", ContributionPoints: 20,
			},
		})
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID:             unrelatedGroupID,
			HostID:         hostUnrelatedID,
			Title:          "Botani Tumbuhan Tingkat Tinggi",
			Category:       "Biologi",
			Format:         domain.FormatOffline,
			LocationOrLink: "Gedung FST",
			StartTime:      now.Add(96 * time.Hour),
			EndTime:        now.Add(98 * time.Hour),
			MaxCapacity:    10,
			Status:         domain.StatusOpen,
			Host: &domain.User{
				ID: hostUnrelatedID, FullName: "Tutor Biologi",
			},
		})

		svc := service.NewGroupServiceWithDeps(groupRepo, userRepo, memRepo)
		recs, err := svc.GetRecommendations(ctx, learnerID)
		if err != nil {
			t.Fatalf("GetRecommendations failed: %v", err)
		}

		if len(recs) != 3 {
			t.Fatalf("expected 3 matched recommendations (excluding unrelated Biologi), got %d", len(recs))
		}
		if recs[0].ID != exactGroupID {
			t.Errorf("expected exact match ranked #1, got %s", recs[0].Title)
		}
		if recs[1].ID != catGroupID {
			t.Errorf("expected category match ranked #2, got %s", recs[1].Title)
		}
		if recs[2].ID != prodiGroupID {
			t.Errorf("expected prodi match ranked #3, got %s", recs[2].Title)
		}
		if recs[0].MatchScore <= recs[1].MatchScore || recs[1].MatchScore <= recs[2].MatchScore {
			t.Errorf("expected strictly descending scores, got %d, %d, %d", recs[0].MatchScore, recs[1].MatchScore, recs[2].MatchScore)
		}
		if len(recs[0].MatchReasons) == 0 || recs[0].MatchReason == "" {
			t.Errorf("expected MatchReason and MatchReasons populated")
		}
		if recs[0].LocationOrLink != "" {
			t.Errorf("expected private online link masked for non-member recommendation, got %q", recs[0].LocationOrLink)
		}
		if recs[0].Host != nil && recs[0].Host.Email != "" {
			t.Errorf("expected host email masked in recommendation, got %q", recs[0].Host.Email)
		}
	})

	t.Run("supports cold-start prodi recommendations without learning skills", func(t *testing.T) {
		groupRepo := newMockGroupRepository()
		userRepo := newMockUserRepository()
		memRepo := newFullMockMembershipRepo()

		febiStudent := uuid.New()
		_ = userRepo.Create(ctx, &domain.User{
			ID:         febiStudent,
			Email:      "siti@student.uinsgd.ac.id",
			FullName:   "Siti Nurhaliza",
			Role:       domain.RoleStudent,
			CampusName: "UIN SGD Bandung - S1 Akuntansi Syariah",
		})

		febiGroupID := uuid.New()
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID:          febiGroupID,
			HostID:      uuid.New(),
			Title:       "Analisis Rasio Keuangan Bank Syariah",
			Category:    "Ekonomi & Bisnis Islam",
			Format:      domain.FormatOnline,
			StartTime:   now.Add(24 * time.Hour),
			EndTime:     now.Add(26 * time.Hour),
			MaxCapacity: 15,
			Status:      domain.StatusOpen,
		})
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID:          uuid.New(),
			HostID:      uuid.New(),
			Title:       "Praktikum Fisika Dasar",
			Category:    "Fisika",
			Format:      domain.FormatOffline,
			StartTime:   now.Add(48 * time.Hour),
			EndTime:     now.Add(50 * time.Hour),
			MaxCapacity: 10,
			Status:      domain.StatusOpen,
		})

		svc := service.NewGroupServiceWithDeps(groupRepo, userRepo, memRepo)
		recs, err := svc.GetRecommendations(ctx, febiStudent)
		if err != nil {
			t.Fatalf("cold-start GetRecommendations failed: %v", err)
		}
		if len(recs) != 1 || recs[0].ID != febiGroupID {
			t.Fatalf("expected only FEBI prodi match returned, got %+v", recs)
		}
		if recs[0].MatchReason != "Sesuai rumpun prodi kamu" {
			t.Errorf("expected reason 'Sesuai rumpun prodi kamu', got %q", recs[0].MatchReason)
		}
	})

	t.Run("excludes own, full, expired, joined/pending, and overlapping-schedule sessions", func(t *testing.T) {
		groupRepo := newMockGroupRepository()
		userRepo := newMockUserRepository()
		memRepo := newFullMockMembershipRepo()

		learnerID := uuid.New()
		skillFEBI := &domain.Skill{ID: uuid.New(), Name: "Ekonomi Mikro Syariah", Category: "Ekonomi & Bisnis Islam"}
		_ = userRepo.Create(ctx, &domain.User{
			ID:         learnerID,
			FullName:   "Rizky",
			Role:       domain.RoleStudent,
			CampusName: "UIN SGD Bandung - S1 Ekonomi Syariah",
		})
		_ = userRepo.SyncUserSkills(ctx, learnerID, []domain.UserSkill{
			{UserID: learnerID, SkillID: skillFEBI.ID, SkillType: domain.SkillLearning, Skill: skillFEBI},
		})

		// Booked session tomorrow 09:00-11:00
		bookedID := uuid.New()
		bookedStart := now.Add(24 * time.Hour)
		bookedEnd := now.Add(26 * time.Hour)
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID: bookedID, HostID: uuid.New(), Title: "Sesi Sudah Diikuti", Category: "Ekonomi & Bisnis Islam",
			Status: domain.StatusOpen, StartTime: bookedStart, EndTime: bookedEnd, MaxCapacity: 10,
		})
		_ = memRepo.Create(ctx, &domain.Membership{
			ID: uuid.New(), GroupID: bookedID, UserID: learnerID, Status: domain.MembershipAccepted,
		})

		// Overlapping candidate tomorrow 10:00-12:00 -> must be excluded
		overlapID := uuid.New()
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID: overlapID, HostID: uuid.New(), Title: "Sesi Bentrok Jadwal", Category: "Ekonomi & Bisnis Islam",
			Status: domain.StatusOpen, StartTime: bookedStart.Add(1 * time.Hour), EndTime: bookedEnd.Add(1 * time.Hour), MaxCapacity: 10,
		})

		// Own hosted group -> excluded
		ownID := uuid.New()
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID: ownID, HostID: learnerID, Title: "Sesi Sendiri", Category: "Ekonomi & Bisnis Islam",
			Status: domain.StatusOpen, StartTime: now.Add(72 * time.Hour), EndTime: now.Add(74 * time.Hour), MaxCapacity: 10,
		})

		// Pending joined group -> excluded
		pendingID := uuid.New()
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID: pendingID, HostID: uuid.New(), Title: "Menunggu Konfirmasi", Category: "Ekonomi & Bisnis Islam",
			Status: domain.StatusOpen, StartTime: now.Add(96 * time.Hour), EndTime: now.Add(98 * time.Hour), MaxCapacity: 10,
		})
		_ = memRepo.Create(ctx, &domain.Membership{
			ID: uuid.New(), GroupID: pendingID, UserID: learnerID, Status: domain.MembershipPending,
		})

		// Expired session -> excluded
		expiredID := uuid.New()
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID: expiredID, HostID: uuid.New(), Title: "Sesi Lampau", Category: "Ekonomi & Bisnis Islam",
			Status: domain.StatusOpen, StartTime: now.Add(-5 * time.Hour), EndTime: now.Add(-3 * time.Hour), MaxCapacity: 10,
		})

		// Clean non-conflicting future match -> included
		validID := uuid.New()
		_ = groupRepo.Create(ctx, &domain.LearningGroup{
			ID: validID, HostID: uuid.New(), Title: "Kajian Ekonomi Mikro Syariah", Category: "Ekonomi & Bisnis Islam",
			Status: domain.StatusOpen, StartTime: now.Add(120 * time.Hour), EndTime: now.Add(122 * time.Hour), MaxCapacity: 10,
		})

		svc := service.NewGroupServiceWithDeps(groupRepo, userRepo, memRepo)
		recs, err := svc.GetRecommendations(ctx, learnerID)
		if err != nil {
			t.Fatalf("GetRecommendations failed: %v", err)
		}
		if len(recs) != 1 || recs[0].ID != validID {
			t.Fatalf("expected only valid non-conflicting session %s, got %+v", validID, recs)
		}
	})
}
