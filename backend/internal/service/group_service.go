package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
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
	Create(ctx context.Context, hostID uuid.UUID, req domain.CreateGroupRequest) (*domain.GroupResponse, error)
	GetByID(ctx context.Context, id uuid.UUID, currentUserID *uuid.UUID) (*domain.GroupResponse, error)
	List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error)
	Update(ctx context.Context, hostID, groupID uuid.UUID, req domain.UpdateGroupRequest) error
	UpdateStatus(ctx context.Context, hostID, groupID uuid.UUID, status domain.GroupStatus) error
	ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error)
	GetRecommendations(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error)
	ResolveMapLink(ctx context.Context, rawInput string) (*domain.MapLocationResolution, error)
}

type groupService struct {
	groupRepo repository.GroupRepository
	userRepo  repository.UserRepository
}

func NewGroupService(groupRepo repository.GroupRepository, userRepo ...repository.UserRepository) GroupService {
	var uRepo repository.UserRepository
	if len(userRepo) > 0 {
		uRepo = userRepo[0]
	}
	return &groupService{groupRepo: groupRepo, userRepo: uRepo}
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
		Status:          domain.StatusOpen,
	}

	if err := s.groupRepo.Create(ctx, group); err != nil {
		return nil, fmt.Errorf("groupService.Create: %w", err)
	}

	return s.groupRepo.FindByID(ctx, group.ID)
}

func (s *groupService) GetByID(ctx context.Context, id uuid.UUID, currentUserID *uuid.UUID) (*domain.GroupResponse, error) {
	resp, err := s.groupRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("groupService.GetByID: %w", err)
	}
	return resp, nil
}

func (s *groupService) List(ctx context.Context, filter domain.GroupFilter, currentUserID *uuid.UUID) ([]domain.GroupResponse, error) {
	return s.groupRepo.List(ctx, filter, currentUserID)
}

func (s *groupService) Update(ctx context.Context, hostID, groupID uuid.UUID, req domain.UpdateGroupRequest) error {
	existing, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return err
	}
	if existing.HostID != hostID {
		return ErrUnauthorizedAction
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
		HostID:          hostID,
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
	if existing.HostID != hostID {
		return ErrUnauthorizedAction
	}

	return s.groupRepo.UpdateStatus(ctx, groupID, status)
}

func (s *groupService) ListByHost(ctx context.Context, hostID uuid.UUID) ([]domain.GroupResponse, error) {
	return s.groupRepo.ListByHost(ctx, hostID)
}

func (s *groupService) GetRecommendations(ctx context.Context, userID uuid.UUID) ([]domain.GroupResponse, error) {
	if userID == uuid.Nil {
		return nil, ErrUnauthorizedAction
	}
	return s.groupRepo.FindRecommendations(ctx, userID)
}

func (s *groupService) ResolveMapLink(ctx context.Context, rawInput string) (*domain.MapLocationResolution, error) {
	rawInput = strings.TrimSpace(rawInput)
	if rawInput == "" {
		return nil, fmt.Errorf("%w: input tautan atau koordinat tidak boleh kosong", ErrInvalidInput)
	}

	// 1. Direct coordinate format (e.g. "-6.365300, 106.831500")
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
