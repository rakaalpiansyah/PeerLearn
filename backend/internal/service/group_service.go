package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

var (
	coordsRegex   = regexp.MustCompile(`^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$`)
	atCoordsRegex = regexp.MustCompile(`@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)`)
	qCoordsRegex  = regexp.MustCompile(`(?:[?&](?:q|ll)=(?:loc:)?)(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)`)
	placeRegex    = regexp.MustCompile(`/place/([^/@?]+)`)
)

var (
	ErrUnauthorizedAction = errors.New("service: unauthorized action for this resource")
	ErrGroupFull          = errors.New("service: learning group has reached maximum capacity")
	ErrInvalidSchedule    = errors.New("service: end time must be after start time")
)

type GroupService interface {
	SetNotifier(notifier NotificationDispatcher)
	SetCoHostRepo(repo repository.GroupCoHostRepository)
	SetMaterialRepo(repo repository.GroupMaterialRepository)
	SetStudyRequestFulfiller(fulfiller StudyRequestFulfiller)
	Create(ctx context.Context, hostID uuid.UUID, req domain.CreateGroupRequest) (*domain.GroupResponse, error)
	GetByID(ctx context.Context, id uuid.UUID, currentUserID *uuid.UUID) (*domain.GroupResponse, error)
	List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error)
	ListForAdmin(ctx context.Context, filter domain.GroupFilter) ([]domain.GroupResponse, error)
	ReviewGroup(ctx context.Context, adminID, groupID uuid.UUID, req domain.ReviewGroupRequest) (*domain.GroupResponse, error)
	Update(ctx context.Context, hostID, groupID uuid.UUID, req domain.UpdateGroupRequest) error
	UpdateStatus(ctx context.Context, hostID, groupID uuid.UUID, status domain.GroupStatus) error
	ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error)
	GetRecommendations(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error)
	ResolveMapLink(ctx context.Context, rawInput string) (*domain.MapLocationResolution, error)
	AddCoHost(ctx context.Context, callerID, groupID, targetUserID uuid.UUID) ([]domain.GroupCoHost, error)
	RemoveCoHost(ctx context.Context, callerID, groupID, targetUserID uuid.UUID) ([]domain.GroupCoHost, error)
	ListMaterials(ctx context.Context, callerID, groupID uuid.UUID) ([]domain.GroupMaterial, error)
	AddMaterial(ctx context.Context, callerID, groupID uuid.UUID, req domain.CreateMaterialRequest) (*domain.GroupMaterial, error)
	DeleteMaterial(ctx context.Context, callerID, groupID, materialID uuid.UUID) error
}

type groupService struct {
	groupRepo             repository.GroupRepository
	userRepo              repository.UserRepository
	membershipRepo        repository.MembershipRepository
	coHostRepo            repository.GroupCoHostRepository
	materialRepo          repository.GroupMaterialRepository
	studyRequestFulfiller StudyRequestFulfiller
	notifier              NotificationDispatcher
}

func (s *groupService) SetStudyRequestFulfiller(fulfiller StudyRequestFulfiller) {
	s.studyRequestFulfiller = fulfiller
}

func (s *groupService) SetNotifier(notifier NotificationDispatcher) {
	s.notifier = notifier
}

func (s *groupService) SetCoHostRepo(repo repository.GroupCoHostRepository) {
	s.coHostRepo = repo
}

func (s *groupService) SetMaterialRepo(repo repository.GroupMaterialRepository) {
	s.materialRepo = repo
}

func NewGroupService(groupRepo repository.GroupRepository, userRepo ...repository.UserRepository) GroupService {
	var uRepo repository.UserRepository
	if len(userRepo) > 0 {
		uRepo = userRepo[0]
	}
	return &groupService{groupRepo: groupRepo, userRepo: uRepo}
}

func NewGroupServiceWithDeps(
	groupRepo repository.GroupRepository,
	userRepo repository.UserRepository,
	membershipRepo repository.MembershipRepository,
) GroupService {
	return &groupService{
		groupRepo:      groupRepo,
		userRepo:       userRepo,
		membershipRepo: membershipRepo,
	}
}

func (s *groupService) Create(ctx context.Context, hostID uuid.UUID, req domain.CreateGroupRequest) (*domain.GroupResponse, error) {
	if s.userRepo != nil {
		hostUser, err := s.userRepo.FindByID(ctx, hostID)
		if err == nil && hostUser != nil {
			if hostUser.AccountStatus == domain.AccountRestricted {
				return nil, fmt.Errorf("%w: akun Anda sedang dibatasi sementara dan tidak dapat membuka sesi belajar baru", ErrUnauthorizedAction)
			}
			if hostUser.AccountStatus == domain.AccountSuspended {
				return nil, fmt.Errorf("%w: akun Anda telah ditangguhkan karena pelanggaran pedoman komunitas", ErrUnauthorizedAction)
			}
		}
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.LocationOrLink = strings.TrimSpace(req.LocationOrLink)

	if req.Title == "" {
		return nil, fmt.Errorf("%w: judul sesi belajar wajib diisi", ErrInvalidInput)
	}
	if req.MaxCapacity <= 0 {
		req.MaxCapacity = 5
	}
	if req.Format == "" {
		req.Format = domain.FormatOnline
	}
	if req.Category == "" {
		req.Category = "Teknologi"
	}
	if req.EndTime.Before(req.StartTime) || req.EndTime.Equal(req.StartTime) {
		req.EndTime = req.StartTime.Add(2 * time.Hour)
	}

	var cleanAgenda []string
	for _, a := range req.Agenda {
		trimmed := strings.TrimSpace(a)
		if trimmed != "" {
			cleanAgenda = append(cleanAgenda, trimmed)
		}
	}
	if cleanAgenda == nil {
		cleanAgenda = []string{}
	}

	group := &domain.LearningGroup{
		ID:              uuid.New(),
		HostID:          hostID,
		Title:           req.Title,
		Description:     req.Description,
		Category:        req.Category,
		Format:          req.Format,
		LocationOrLink:  req.LocationOrLink,
		Latitude:        req.Latitude,
		Longitude:       req.Longitude,
		BuildingDetails: strings.TrimSpace(req.BuildingDetails),
		Agenda:          cleanAgenda,
		Prerequisites:   strings.TrimSpace(req.Prerequisites),
		StartTime:       req.StartTime,
		EndTime:         req.EndTime,
		MaxCapacity:     req.MaxCapacity,
		Status:          domain.StatusPendingApproval,
	}

	if err := s.groupRepo.Create(ctx, group); err != nil {
		return nil, fmt.Errorf("groupService.Create: %w", err)
	}

	if req.StudyRequestID != nil && *req.StudyRequestID != uuid.Nil && s.studyRequestFulfiller != nil {
		_ = s.studyRequestFulfiller.FulfillFromGroup(ctx, *req.StudyRequestID, group.ID, group.Title, hostID)
	}

	return s.groupRepo.FindByID(ctx, group.ID)
}

func (s *groupService) resolveViewerRole(ctx context.Context, currentUserID *uuid.UUID) domain.UserRole {
	if role, ok := domain.ViewerRoleFromContext(ctx); ok && role != "" {
		return role
	}
	if currentUserID != nil && s.userRepo != nil {
		if u, err := s.userRepo.FindByID(ctx, *currentUserID); err == nil && u != nil {
			return u.Role
		}
	}
	return ""
}

func (s *groupService) isGroupManager(ctx context.Context, group *domain.GroupResponse, callerID uuid.UUID) bool {
	if group == nil || callerID == uuid.Nil {
		return false
	}
	if group.HostID == callerID {
		return true
	}
	if s.coHostRepo != nil {
		isCo, err := s.coHostRepo.IsCoHost(ctx, group.ID, callerID)
		if err == nil && isCo {
			return true
		}
	}
	return false
}

func (s *groupService) hydrateCoHostsSingle(ctx context.Context, g *domain.GroupResponse) {
	if s.coHostRepo == nil || g == nil {
		return
	}
	coHosts, err := s.coHostRepo.ListByGroup(ctx, g.ID)
	if err == nil && len(coHosts) > 0 {
		g.CoHosts = coHosts
	}
}

func (s *groupService) hydrateCoHostsSlice(ctx context.Context, groups []domain.GroupResponse) {
	if s.coHostRepo == nil || len(groups) == 0 {
		return
	}
	ids := make([]uuid.UUID, 0, len(groups))
	for _, g := range groups {
		ids = append(ids, g.ID)
	}
	byGroup, err := s.coHostRepo.ListByGroupIDs(ctx, ids)
	if err != nil {
		return
	}
	for i := range groups {
		if ch, ok := byGroup[groups[i].ID]; ok && len(ch) > 0 {
			groups[i].CoHosts = ch
		}
	}
}

func (s *groupService) GetByID(ctx context.Context, id uuid.UUID, currentUserID *uuid.UUID) (*domain.GroupResponse, error) {
	resp, err := s.groupRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("groupService.GetByID: %w", err)
	}
	s.hydrateCoHostsSingle(ctx, resp)
	if currentUserID != nil && s.membershipRepo != nil && resp.UserMembership == nil {
		if m, mErr := s.membershipRepo.Find(ctx, id, *currentUserID); mErr == nil && m != nil {
			st := m.Status
			resp.UserMembership = &st
		}
	}
	domain.SanitizeGroupForViewer(resp, currentUserID, s.resolveViewerRole(ctx, currentUserID))
	return resp, nil
}

func (s *groupService) List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error) {
	filter.IncludeUnapproved = false
	groups, err := s.groupRepo.List(ctx, filter, currentUserID)
	if err != nil {
		return nil, err
	}
	s.hydrateCoHostsSlice(ctx, groups)
	viewerRole := s.resolveViewerRole(ctx, currentUserID)
	for i := range groups {
		domain.SanitizeGroupForViewer(&groups[i], currentUserID, viewerRole)
	}
	return groups, nil
}

func (s *groupService) ListForAdmin(ctx context.Context, filter domain.GroupFilter) ([]domain.GroupResponse, error) {
	filter.IncludeUnapproved = true
	groups, err := s.groupRepo.List(ctx, filter, nil)
	if err != nil {
		return nil, err
	}
	s.hydrateCoHostsSlice(ctx, groups)
	return groups, nil
}

func (s *groupService) ReviewGroup(ctx context.Context, adminID, groupID uuid.UUID, req domain.ReviewGroupRequest) (*domain.GroupResponse, error) {
	existing, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("groupService.ReviewGroup: %w", err)
	}

	note := strings.TrimSpace(req.Note)
	switch req.Action {
	case "approve":
		if err := s.groupRepo.ReviewGroup(ctx, groupID, adminID, domain.StatusOpen, note); err != nil {
			return nil, fmt.Errorf("groupService.ReviewGroup approve: %w", err)
		}
		if s.notifier != nil {
			gid := existing.ID
			_ = s.notifier.Notify(ctx, existing.HostID, domain.NotificationSessionApproved, "Sesi Belajar Disetujui Admin", fmt.Sprintf("Sesi %q telah disetujui admin dan tayang di katalog mahasiswa.", existing.Title), &gid)
		}
	case "reject":
		if note == "" {
			return nil, fmt.Errorf("%w: alasan penolakan wajib diisi agar mahasiswa dapat memperbaiki pengajuan", ErrInvalidInput)
		}
		if err := s.groupRepo.ReviewGroup(ctx, groupID, adminID, domain.StatusRejected, note); err != nil {
			return nil, fmt.Errorf("groupService.ReviewGroup reject: %w", err)
		}
		if s.notifier != nil {
			gid := existing.ID
			_ = s.notifier.Notify(ctx, existing.HostID, domain.NotificationSessionRejected, "Sesi Belajar Perlu Revisi", fmt.Sprintf("Sesi %q ditolak admin dengan catatan: %s", existing.Title, note), &gid)
		}
	default:
		return nil, fmt.Errorf("%w: aksi peninjauan tidak valid (harus 'approve' atau 'reject')", ErrInvalidInput)
	}

	return s.groupRepo.FindByID(ctx, groupID)
}

func (s *groupService) Update(ctx context.Context, hostID, groupID uuid.UUID, req domain.UpdateGroupRequest) error {
	existing, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return err
	}
	if !s.isGroupManager(ctx, existing, hostID) {
		return ErrUnauthorizedAction
	}

	req.Title = strings.TrimSpace(req.Title)
	req.LocationOrLink = strings.TrimSpace(req.LocationOrLink)
	if req.Title == "" {
		return fmt.Errorf("%w: judul sesi belajar wajib diisi", ErrInvalidInput)
	}
	if !req.EndTime.IsZero() && !req.StartTime.IsZero() && (req.EndTime.Before(req.StartTime) || req.EndTime.Equal(req.StartTime)) {
		return ErrInvalidSchedule
	}

	var cleanAgenda []string
	for _, a := range req.Agenda {
		trimmed := strings.TrimSpace(a)
		if trimmed != "" {
			cleanAgenda = append(cleanAgenda, trimmed)
		}
	}
	if cleanAgenda == nil {
		cleanAgenda = []string{}
	}

	g := &domain.LearningGroup{
		ID:              groupID,
		HostID:          existing.HostID,
		Title:           strings.TrimSpace(req.Title),
		Description:     strings.TrimSpace(req.Description),
		Category:        req.Category,
		Format:          req.Format,
		LocationOrLink:  strings.TrimSpace(req.LocationOrLink),
		Latitude:        req.Latitude,
		Longitude:       req.Longitude,
		BuildingDetails: strings.TrimSpace(req.BuildingDetails),
		Agenda:          cleanAgenda,
		Prerequisites:   strings.TrimSpace(req.Prerequisites),
		StartTime:       req.StartTime,
		EndTime:         req.EndTime,
		MaxCapacity:     req.MaxCapacity,
	}

	return s.groupRepo.Update(ctx, g)
}

func (s *groupService) UpdateStatus(ctx context.Context, hostID, groupID uuid.UUID, status domain.GroupStatus) error {
	existing, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return err
	}
	if status == domain.StatusCancelled {
		if existing.HostID != hostID {
			return ErrUnauthorizedAction
		}
	} else if !s.isGroupManager(ctx, existing, hostID) {
		return ErrUnauthorizedAction
	}

	if (existing.Status == domain.StatusPendingApproval || existing.Status == domain.StatusRejected) && status != domain.StatusCancelled {
		return fmt.Errorf("%w: sesi belum disetujui admin sehingga belum dapat dibuka ke publik", ErrUnauthorizedAction)
	}

	switch status {
	case domain.StatusOpen, domain.StatusOngoing, domain.StatusCompleted, domain.StatusCancelled:
		if err := s.groupRepo.UpdateStatus(ctx, groupID, status); err != nil {
			return err
		}
		if s.notifier != nil && s.membershipRepo != nil && (status == domain.StatusOngoing || status == domain.StatusCompleted || status == domain.StatusCancelled) {
			var title, msg string
			switch status {
			case domain.StatusOngoing:
				title = "Sesi Belajar Dimulai"
				msg = fmt.Sprintf("Sesi %q sedang berlangsung sekarang.", existing.Title)
			case domain.StatusCompleted:
				title = "Sesi Belajar Selesai"
				msg = fmt.Sprintf("Sesi %q telah selesai. Berikan ulasan atau cek catatan kehadiran Anda.", existing.Title)
			case domain.StatusCancelled:
				title = "Sesi Belajar Dibatalkan"
				msg = fmt.Sprintf("Tutor membatalkan sesi %q.", existing.Title)
			}
			if members, mErr := s.membershipRepo.ListByGroup(ctx, groupID); mErr == nil {
				gid := groupID
				for _, m := range members {
					if m.UserID == existing.HostID {
						continue
					}
					if m.Status == domain.MembershipAccepted || m.Status == domain.MembershipAttended {
						_ = s.notifier.Notify(ctx, m.UserID, domain.NotificationSessionStatus, title, msg, &gid)
					}
				}
			}
		}
		return nil
	default:
		return fmt.Errorf("%w: status sesi tidak valid", ErrInvalidInput)
	}
}

func (s *groupService) ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error) {
	groups, err := s.groupRepo.ListByHost(ctx, hostID)
	if err != nil {
		return nil, err
	}
	s.hydrateCoHostsSlice(ctx, groups)
	return groups, nil
}

func (s *groupService) GetRecommendations(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error) {
	if userID == uuid.Nil {
		return nil, ErrUnauthorizedAction
	}

	viewerRole := s.resolveViewerRole(ctx, &userID)
	if s.userRepo == nil {
		groups, err := s.groupRepo.FindRecommendations(ctx, userID)
		if err != nil {
			return nil, err
		}
		for i := range groups {
			uid := userID
			domain.SanitizeGroupForViewer(&groups[i], &uid, viewerRole)
		}
		return groups, nil
	}

	now := time.Now().UTC()
	user, _ := s.userRepo.FindByID(ctx, userID)
	userSkills, _ := s.userRepo.GetUserSkills(ctx, userID)
	learningSkills := make([]domain.UserSkill, 0)
	for _, us := range userSkills {
		if us.SkillType == domain.SkillLearning {
			learningSkills = append(learningSkills, us)
		}
	}

	candidates, err := s.groupRepo.List(ctx, domain.GroupFilter{Status: domain.StatusOpen}, &userID)
	if err != nil {
		return nil, fmt.Errorf("groupService.GetRecommendations list: %w", err)
	}

	excludedIDs := make(map[uuid.UUID]bool)
	bookedWindows := make([]scheduleWindow, 0)

	if hosted, hErr := s.groupRepo.ListByHost(ctx, userID); hErr == nil {
		for _, h := range hosted {
			excludedIDs[h.ID] = true
			if (h.Status == domain.StatusOpen || h.Status == domain.StatusOngoing) && h.EndTime.After(now) {
				bookedWindows = append(bookedWindows, scheduleWindow{start: h.StartTime, end: h.EndTime})
			}
		}
	}

	if s.coHostRepo != nil {
		if coHostedIDs, chErr := s.coHostRepo.ListGroupIDsByUser(ctx, userID); chErr == nil {
			for _, gid := range coHostedIDs {
				excludedIDs[gid] = true
				if g, gErr := s.groupRepo.FindByID(ctx, gid); gErr == nil && g != nil {
					if (g.Status == domain.StatusOpen || g.Status == domain.StatusOngoing) && g.EndTime.After(now) {
						bookedWindows = append(bookedWindows, scheduleWindow{start: g.StartTime, end: g.EndTime})
					}
				}
			}
		}
	}

	if s.membershipRepo != nil {
		if mems, mErr := s.membershipRepo.ListByUser(ctx, userID); mErr == nil {
			for _, m := range mems {
				if m.Status == domain.MembershipPending || m.Status == domain.MembershipAccepted || m.Status == domain.MembershipAttended || m.Status == domain.MembershipWaitlisted {
					excludedIDs[m.GroupID] = true
				}
				if m.Status == domain.MembershipAccepted || m.Status == domain.MembershipAttended {
					if g, gErr := s.groupRepo.FindByID(ctx, m.GroupID); gErr == nil && g != nil {
						if (g.Status == domain.StatusOpen || g.Status == domain.StatusOngoing) && g.EndTime.After(now) {
							bookedWindows = append(bookedWindows, scheduleWindow{start: g.StartTime, end: g.EndTime})
						}
					}
				}
			}
		}
	}

	campusName := ""
	if user != nil {
		campusName = user.CampusName
	}
	campusCategories := inferCategoriesFromCampus(campusName)
	hostSkillCache := make(map[uuid.UUID]map[uuid.UUID]bool)

	eligible := make([]domain.GroupResponse, 0, len(candidates))
	matched := make([]domain.GroupResponse, 0, len(candidates))

	for _, candidate := range candidates {
		if candidate.HostID == userID || excludedIDs[candidate.ID] {
			continue
		}
		if candidate.Status != domain.StatusOpen {
			continue
		}
		if !candidate.EndTime.IsZero() && !candidate.EndTime.After(now) {
			continue
		}
		if candidate.MaxCapacity > 0 && candidate.CurrentMembers >= candidate.MaxCapacity {
			continue
		}
		if candidate.UserMembership != nil {
			st := *candidate.UserMembership
			if st == domain.MembershipPending || st == domain.MembershipAccepted || st == domain.MembershipAttended {
				continue
			}
		}

		overlaps := false
		for _, bw := range bookedWindows {
			if hasScheduleOverlap(candidate.StartTime, candidate.EndTime, bw.start, bw.end) {
				overlaps = true
				break
			}
		}
		if overlaps {
			continue
		}

		eligible = append(eligible, candidate)

		var hostMastered map[uuid.UUID]bool
		if len(learningSkills) > 0 {
			cached, ok := hostSkillCache[candidate.HostID]
			if !ok {
				cached = make(map[uuid.UUID]bool)
				if hSkills, hsErr := s.userRepo.GetUserSkills(ctx, candidate.HostID); hsErr == nil {
					for _, hs := range hSkills {
						if hs.SkillType == domain.SkillMastered {
							cached[hs.SkillID] = true
						}
					}
				}
				hostSkillCache[candidate.HostID] = cached
			}
			hostMastered = cached
		}

		score, reasons := scoreRecommendationCandidate(candidate, learningSkills, hostMastered, campusCategories, now)

		if len(learningSkills) == 0 && len(campusCategories) == 0 {
			if score < 35 {
				score = 35
				if candidate.Host != nil && candidate.Host.ContributionPoints >= 20 {
					score += 10
				}
				if candidate.StartTime.After(now) && !candidate.StartTime.After(now.Add(7*24*time.Hour)) {
					score += 5
				}
			}
			reasons = append([]string{"Sesi aktif populer UIN SGD"}, reasons...)
			if len(reasons) > 3 {
				reasons = reasons[:3]
			}
		}

		minScore := 20
		if score < minScore {
			continue
		}

		candidate.MatchScore = score
		candidate.MatchReasons = reasons
		if len(reasons) > 0 {
			candidate.MatchReason = reasons[0]
		}
		matched = append(matched, candidate)
	}

	// Cold-start fallback when user has no learning skills configured and no prodi category matched any session
	if len(learningSkills) == 0 && len(matched) == 0 && len(eligible) > 0 {
		for _, candidate := range eligible {
			score, reasons := scoreRecommendationCandidate(candidate, nil, nil, nil, now)
			if score < 30 {
				score = 30
			}
			reasons = append([]string{"Sesi aktif lintas fakultas UIN SGD"}, reasons...)
			if len(reasons) > 3 {
				reasons = reasons[:3]
			}
			candidate.MatchScore = score
			candidate.MatchReasons = reasons
			candidate.MatchReason = reasons[0]
			matched = append(matched, candidate)
		}
	}

	sort.SliceStable(matched, func(i, j int) bool {
		if matched[i].MatchScore != matched[j].MatchScore {
			return matched[i].MatchScore > matched[j].MatchScore
		}
		pi, pj := 0, 0
		if matched[i].Host != nil {
			pi = matched[i].Host.ContributionPoints
		}
		if matched[j].Host != nil {
			pj = matched[j].Host.ContributionPoints
		}
		if pi != pj {
			return pi > pj
		}
		return matched[i].StartTime.Before(matched[j].StartTime)
	})

	if len(matched) > 20 {
		matched = matched[:20]
	}

	s.hydrateCoHostsSlice(ctx, matched)

	for i := range matched {
		uid := userID
		domain.SanitizeGroupForViewer(&matched[i], &uid, viewerRole)
	}

	return matched, nil
}

func (s *groupService) ResolveMapLink(ctx context.Context, rawInput string) (*domain.MapLocationResolution, error) {
	rawInput = strings.TrimSpace(rawInput)
	if rawInput == "" {
		return nil, fmt.Errorf("%w: input tautan atau koordinat tidak boleh kosong", ErrInvalidInput)
	}

	// 1. Direct coordinate format (e.g. "-6.931754, 107.717145")
	if matches := coordsRegex.FindStringSubmatch(rawInput); len(matches) == 3 {
		lat, err1 := strconv.ParseFloat(matches[1], 64)
		lng, err2 := strconv.ParseFloat(matches[2], 64)
		if err1 == nil && err2 == nil && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 {
			return &domain.MapLocationResolution{
				Latitude:  lat,
				Longitude: lng,
			}, nil
		}
	}

	// 2. URL parsing & scheme normalizer
	targetURL := rawInput
	if !strings.HasPrefix(targetURL, "http://") && !strings.HasPrefix(targetURL, "https://") {
		targetURL = "https://" + targetURL
	}

	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("%w: format tautan tidak valid: %v", ErrInvalidInput, err)
	}

	// 3. Domain validation for SSRF security
	host := strings.ToLower(parsedURL.Hostname())
	isAllowed := host == "maps.app.goo.gl" ||
		host == "goo.gl" ||
		host == "google.com" ||
		strings.HasSuffix(host, ".google.com") ||
		host == "google.co.id" ||
		strings.HasSuffix(host, ".google.co.id")

	if !isAllowed {
		return nil, fmt.Errorf("%w: domain tidak didukung, harap gunakan tautan Google Maps resmi (maps.google.com atau maps.app.goo.gl)", ErrInvalidInput)
	}

	// 4. Try extract coordinates directly from the parsed URL
	if lat, lng, place, found := extractCoordsFromURL(parsedURL.String()); found {
		return &domain.MapLocationResolution{
			Latitude:    lat,
			Longitude:   lng,
			PlaceName:   place,
			ResolvedURL: parsedURL.String(),
		}, nil
	}

	// 5. Follow HTTP redirects for shortlinks (maps.app.goo.gl, goo.gl)
	client := &http.Client{
		Timeout: 6 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 6 {
				return http.ErrUseLastResponse
			}
			rHost := strings.ToLower(req.URL.Hostname())
			if !(rHost == "maps.app.goo.gl" || rHost == "goo.gl" || rHost == "google.com" || strings.HasSuffix(rHost, ".google.com") || rHost == "google.co.id" || strings.HasSuffix(rHost, ".google.co.id")) {
				return errors.New("pengalihan ke domain tidak terpercaya ditolak")
			}
			return nil
		},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsedURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("%w: gagal membuat permintaan: %v", ErrInvalidInput, err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: gagal menghubungi tautan Google Maps: %v", ErrInvalidInput, err)
	}
	defer resp.Body.Close()

	finalURL := resp.Request.URL.String()
	if lat, lng, place, found := extractCoordsFromURL(finalURL); found {
		return &domain.MapLocationResolution{
			Latitude:    lat,
			Longitude:   lng,
			PlaceName:   place,
			ResolvedURL: finalURL,
		}, nil
	}

	return nil, fmt.Errorf("%w: tidak dapat mendeteksi titik koordinat dari tautan Google Maps tersebut", ErrInvalidInput)
}

func extractCoordsFromURL(raw string) (float64, float64, string, bool) {
	var lat, lng float64
	var found bool

	if matches := atCoordsRegex.FindStringSubmatch(raw); len(matches) == 3 {
		l1, e1 := strconv.ParseFloat(matches[1], 64)
		l2, e2 := strconv.ParseFloat(matches[2], 64)
		if e1 == nil && e2 == nil && l1 >= -90 && l1 <= 90 && l2 >= -180 && l2 <= 180 {
			lat = l1
			lng = l2
			found = true
		}
	} else if matches := qCoordsRegex.FindStringSubmatch(raw); len(matches) == 3 {
		l1, e1 := strconv.ParseFloat(matches[1], 64)
		l2, e2 := strconv.ParseFloat(matches[2], 64)
		if e1 == nil && e2 == nil && l1 >= -90 && l1 <= 90 && l2 >= -180 && l2 <= 180 {
			lat = l1
			lng = l2
			found = true
		}
	}

	if !found {
		return 0, 0, "", false
	}

	var placeName string
	if pMatches := placeRegex.FindStringSubmatch(raw); len(pMatches) == 2 {
		unescaped, err := url.PathUnescape(pMatches[1])
		if err == nil {
			placeName = strings.TrimSpace(strings.ReplaceAll(unescaped, "+", " "))
		}
	}

	return lat, lng, placeName, true
}

func sanitizeCoHostList(list []domain.GroupCoHost) []domain.GroupCoHost {
	out := make([]domain.GroupCoHost, 0, len(list))
	for _, ch := range list {
		cp := ch
		if ch.User != nil {
			uCopy := *ch.User
			uCopy.Email = ""
			cp.User = &uCopy
		}
		out = append(out, cp)
	}
	return out
}

func (s *groupService) AddCoHost(ctx context.Context, callerID, groupID, targetUserID uuid.UUID) ([]domain.GroupCoHost, error) {
	if s.coHostRepo == nil || s.userRepo == nil {
		return nil, fmt.Errorf("%w: layanan co-author belum tersedia", ErrInvalidInput)
	}
	existing, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if existing.HostID != callerID {
		return nil, ErrUnauthorizedAction
	}
	if targetUserID == uuid.Nil || targetUserID == existing.HostID {
		return nil, fmt.Errorf("%w: pilih mahasiswa atau rekan lain yang valid sebagai Co-Author", ErrInvalidInput)
	}

	targetUser, err := s.userRepo.FindByID(ctx, targetUserID)
	if err != nil || targetUser == nil {
		return nil, fmt.Errorf("%w: akun calon Co-Author tidak ditemukan", ErrInvalidInput)
	}
	if targetUser.AccountStatus == domain.AccountSuspended {
		return nil, fmt.Errorf("%w: akun yang sedang ditangguhkan tidak dapat dijadikan Co-Author", ErrInvalidInput)
	}

	currentCoHosts, err := s.coHostRepo.ListByGroup(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("groupService.AddCoHost list: %w", err)
	}
	for _, ch := range currentCoHosts {
		if ch.UserID == targetUserID {
			return sanitizeCoHostList(currentCoHosts), nil
		}
	}
	if len(currentCoHosts) >= 5 {
		return nil, fmt.Errorf("%w: maksimal 5 Co-Author dalam satu sesi belajar", ErrInvalidInput)
	}

	if err := s.coHostRepo.Add(ctx, groupID, targetUserID, callerID); err != nil {
		return nil, fmt.Errorf("groupService.AddCoHost add: %w", err)
	}

	if s.membershipRepo != nil {
		if m, mErr := s.membershipRepo.Find(ctx, groupID, targetUserID); mErr == nil && m != nil {
			if m.Status == domain.MembershipPending || m.Status == domain.MembershipWaitlisted {
				_ = s.membershipRepo.UpdateStatus(ctx, m.ID, domain.MembershipCancelled)
			}
		}
	}

	if s.notifier != nil {
		gid := existing.ID
		_ = s.notifier.Notify(ctx, targetUserID, domain.NotificationCoHostAdded, "Ditambahkan sebagai Co-Author", fmt.Sprintf("Anda ditambahkan sebagai Co-Author untuk ikut mengelola sesi %q.", existing.Title), &gid)
	}

	updated, err := s.coHostRepo.ListByGroup(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("groupService.AddCoHost refresh: %w", err)
	}
	return sanitizeCoHostList(updated), nil
}

func (s *groupService) RemoveCoHost(ctx context.Context, callerID, groupID, targetUserID uuid.UUID) ([]domain.GroupCoHost, error) {
	if s.coHostRepo == nil {
		return nil, fmt.Errorf("%w: layanan co-author belum tersedia", ErrInvalidInput)
	}
	existing, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if existing.HostID != callerID {
		return nil, ErrUnauthorizedAction
	}
	if targetUserID == uuid.Nil {
		return nil, fmt.Errorf("%w: ID Co-Author tidak valid", ErrInvalidInput)
	}

	if err := s.coHostRepo.Remove(ctx, groupID, targetUserID); err != nil {
		return nil, fmt.Errorf("groupService.RemoveCoHost: %w", err)
	}

	if s.notifier != nil {
		gid := existing.ID
		_ = s.notifier.Notify(ctx, targetUserID, domain.NotificationCoHostRemoved, "Status Co-Author Dicabut", fmt.Sprintf("Akses Co-Author Anda pada sesi %q telah dicabut oleh penyelenggara utama.", existing.Title), &gid)
	}

	updated, err := s.coHostRepo.ListByGroup(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("groupService.RemoveCoHost refresh: %w", err)
	}
	return sanitizeCoHostList(updated), nil
}

func (s *groupService) ListMaterials(ctx context.Context, callerID, groupID uuid.UUID) ([]domain.GroupMaterial, error) {
	if s.materialRepo == nil {
		return []domain.GroupMaterial{}, nil
	}
	existing, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, err
	}

	var callerPtr *uuid.UUID
	if callerID != uuid.Nil {
		callerPtr = &callerID
	}
	viewerRole := s.resolveViewerRole(ctx, callerPtr)
	allowed := viewerRole == domain.RoleAdmin || s.isGroupManager(ctx, existing, callerID)
	if !allowed && callerID != uuid.Nil && s.membershipRepo != nil {
		if m, mErr := s.membershipRepo.Find(ctx, groupID, callerID); mErr == nil && m != nil {
			if m.Status == domain.MembershipAccepted || m.Status == domain.MembershipAttended {
				allowed = true
			}
		}
	}
	if !allowed {
		return nil, ErrUnauthorizedAction
	}

	return s.materialRepo.ListByGroup(ctx, groupID)
}

func (s *groupService) AddMaterial(ctx context.Context, callerID, groupID uuid.UUID, req domain.CreateMaterialRequest) (*domain.GroupMaterial, error) {
	if s.materialRepo == nil {
		return nil, fmt.Errorf("%w: layanan materi sesi belum tersedia", ErrInvalidInput)
	}
	existing, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if !s.isGroupManager(ctx, existing, callerID) {
		return nil, ErrUnauthorizedAction
	}

	title := strings.TrimSpace(req.Title)
	if len(title) < 2 || len(title) > 160 {
		return nil, fmt.Errorf("%w: judul materi wajib antara 2 hingga 160 karakter", ErrInvalidInput)
	}

	rawURL := strings.TrimSpace(req.URL)
	parsedURL, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return nil, fmt.Errorf("%w: tautan materi tidak valid, gunakan format https://...", ErrInvalidInput)
	}
	scheme := strings.ToLower(parsedURL.Scheme)
	if (scheme != "https" && scheme != "http") || parsedURL.Host == "" {
		return nil, fmt.Errorf("%w: tautan materi harus menggunakan protokol http:// atau https://", ErrInvalidInput)
	}
	if len(rawURL) > 1000 {
		return nil, fmt.Errorf("%w: tautan materi melebihi batas 1.000 karakter", ErrInvalidInput)
	}

	matType := strings.TrimSpace(strings.ToLower(req.MaterialType))
	switch matType {
	case "slide", "modul", "catatan", "rekaman", "referensi":
	case "":
		matType = "referensi"
	default:
		return nil, fmt.Errorf("%w: jenis materi harus berupa slide, modul, catatan, rekaman, atau referensi", ErrInvalidInput)
	}

	m := &domain.GroupMaterial{
		ID:           uuid.New(),
		GroupID:      groupID,
		UploadedBy:   callerID,
		Title:        title,
		URL:          rawURL,
		MaterialType: matType,
	}
	if err := s.materialRepo.Create(ctx, m); err != nil {
		return nil, fmt.Errorf("groupService.AddMaterial: %w", err)
	}

	if s.userRepo != nil {
		if uploader, uErr := s.userRepo.FindByID(ctx, callerID); uErr == nil && uploader != nil {
			uResp := domain.ToUserResponse(uploader, nil)
			uResp.Email = ""
			m.Uploader = &uResp
		}
	}
	return m, nil
}

func (s *groupService) DeleteMaterial(ctx context.Context, callerID, groupID, materialID uuid.UUID) error {
	if s.materialRepo == nil {
		return fmt.Errorf("%w: layanan materi sesi belum tersedia", ErrInvalidInput)
	}
	existing, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return err
	}
	if !s.isGroupManager(ctx, existing, callerID) {
		return ErrUnauthorizedAction
	}

	mat, err := s.materialRepo.FindByID(ctx, materialID)
	if err != nil || mat == nil || mat.GroupID != groupID {
		return fmt.Errorf("%w: materi tidak ditemukan pada sesi ini", ErrInvalidInput)
	}
	return s.materialRepo.Delete(ctx, materialID)
}
