package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
)

type scheduleWindow struct {
	start time.Time
	end   time.Time
}

type campusCategoryRule struct {
	keywords   []string
	categories []string
}

var uinCampusCategoryRules = []campusCategoryRule{
	{
		keywords:   []string{"informatika", "komputer", "sains data"},
		categories: []string{"Teknologi", "Sains Data"},
	},
	{
		keywords:   []string{"elektro"},
		categories: []string{"Teknik Elektro", "Teknologi"},
	},
	{
		keywords:   []string{"lingkungan"},
		categories: []string{"Teknik Lingkungan"},
	},
	{
		keywords:   []string{"matematika"},
		categories: []string{"Matematika", "Sains Data"},
	},
	{
		keywords:   []string{"fisika"},
		categories: []string{"Fisika"},
	},
	{
		keywords:   []string{"kimia"},
		categories: []string{"Kimia"},
	},
	{
		keywords:   []string{"biologi"},
		categories: []string{"Biologi"},
	},
	{
		keywords:   []string{"agroteknologi", "pertanian"},
		categories: []string{"Agroteknologi"},
	},
	{
		keywords:   []string{"ushuluddin", "tafsir", "quran", "hadis", "aqidah", "filsafat", "tasawuf", "studi agama"},
		categories: []string{"Ushuluddin & Studi Islam"},
	},
	{
		keywords:   []string{"tarbiyah", "pendidikan", "pgmi", "piaud", "ftk"},
		categories: []string{"Pendidikan & Tarbiyah"},
	},
	{
		keywords:   []string{"syariah", "hukum", "muamalah", "siyasah", "jinayah", "mazhab", "fsh"},
		categories: []string{"Hukum & Syariah"},
	},
	{
		keywords:   []string{"dakwah", "komunikasi", "jurnalistik", "humas", "konseling islam", "penyiaran", "fdk"},
		categories: []string{"Komunikasi & Dakwah"},
	},
	{
		keywords:   []string{"adab", "humaniora", "sejarah peradaban", "fah"},
		categories: []string{"Adab & Humaniora"},
	},
	{
		keywords:   []string{"sastra", "bahasa"},
		categories: []string{"Adab & Humaniora", "Bahasa"},
	},
	{
		keywords:   []string{"psikologi", "fpsi"},
		categories: []string{"Psikologi & Konseling"},
	},
	{
		keywords:   []string{"fisip", "administrasi publik", "sosiologi", "ilmu politik", "ilmu sosial"},
		categories: []string{"Ilmu Sosial & Politik"},
	},
	{
		keywords:   []string{"febi", "ekonomi", "akuntansi", "perbankan", "keuangan syariah"},
		categories: []string{"Ekonomi & Bisnis Islam"},
	},
}

var genericSkillTokens = map[string]bool{
	"akademik":   true,
	"analisis":   true,
	"bahasa":     true,
	"basis":      true,
	"dasar":      true,
	"data":       true,
	"desain":     true,
	"ekonomi":    true,
	"hukum":      true,
	"ilmu":       true,
	"islam":      true,
	"lanjutan":   true,
	"lanjut":     true,
	"manajemen":  true,
	"metode":     true,
	"pendidikan": true,
	"pengantar":  true,
	"praktik":    true,
	"sistem":     true,
	"sosial":     true,
	"studi":      true,
	"syariah":    true,
	"teknik":     true,
	"teori":      true,
	"umum":       true,
}

func inferCategoriesFromCampus(campusName string) []string {
	lower := strings.ToLower(strings.TrimSpace(campusName))
	if lower == "" {
		return nil
	}

	seen := make(map[string]bool)
	categories := make([]string, 0)
	addCategory := func(cat string) {
		if !seen[cat] {
			seen[cat] = true
			categories = append(categories, cat)
		}
	}

	for _, rule := range uinCampusCategoryRules {
		for _, kw := range rule.keywords {
			if strings.Contains(lower, kw) {
				for _, cat := range rule.categories {
					addCategory(cat)
				}
				break
			}
		}
	}

	// Match FEBI Manajemen while avoiding Pendidikan/Dakwah majors whose titles also contain "Manajemen".
	if strings.Contains(lower, "manajemen") &&
		!strings.Contains(lower, "dakwah") &&
		!strings.Contains(lower, "pendidikan") {
		addCategory("Ekonomi & Bisnis Islam")
	}

	return categories
}

func hasScheduleOverlap(aStart, aEnd, bStart, bEnd time.Time) bool {
	if aStart.IsZero() || aEnd.IsZero() || bStart.IsZero() || bEnd.IsZero() {
		return false
	}
	return aStart.Before(bEnd) && bStart.Before(aEnd)
}

func skillTextMatches(skillName, searchableText string) bool {
	lowerSkill := strings.ToLower(strings.TrimSpace(skillName))
	if lowerSkill == "" || searchableText == "" {
		return false
	}
	if strings.Contains(searchableText, lowerSkill) {
		return true
	}

	tokens := strings.FieldsFunc(lowerSkill, func(r rune) bool {
		return (r < 'a' || r > 'z') && (r < '0' || r > '9')
	})
	for _, tok := range tokens {
		if len(tok) < 4 || genericSkillTokens[tok] {
			continue
		}
		if strings.Contains(searchableText, tok) {
			return true
		}
	}
	return false
}

func scoreRecommendationCandidate(
	candidate domain.GroupResponse,
	learningSkills []domain.UserSkill,
	hostMasteredSkillIDs map[uuid.UUID]bool,
	campusCategories []string,
	now time.Time,
) (int, []string) {
	score := 0
	reasons := make([]string, 0, 4)

	searchable := strings.ToLower(
		candidate.Title + " " + candidate.Description + " " + strings.Join(candidate.Agenda, " "),
	)

	matchedSkillName := ""
	categoryMatched := false

	for _, ls := range learningSkills {
		skillName := ""
		skillCategory := ""
		if ls.Skill != nil {
			skillName = ls.Skill.Name
			skillCategory = ls.Skill.Category
		}

		if matchedSkillName == "" {
			if hostMasteredSkillIDs != nil && hostMasteredSkillIDs[ls.SkillID] {
				matchedSkillName = skillName
				if matchedSkillName == "" {
					matchedSkillName = candidate.Category
				}
			} else if skillTextMatches(skillName, searchable) {
				matchedSkillName = skillName
			}
		}

		if !categoryMatched && skillCategory != "" && strings.EqualFold(skillCategory, candidate.Category) {
			categoryMatched = true
		}
	}

	if matchedSkillName != "" {
		score += 40
		reasons = append(reasons, fmt.Sprintf("Cocok target belajar: %s", matchedSkillName))
	}

	if categoryMatched {
		score += 25
		reasons = append(reasons, fmt.Sprintf("Sesuai minat kategori %s", candidate.Category))
	}

	for _, cc := range campusCategories {
		if strings.EqualFold(cc, candidate.Category) {
			score += 20
			reasons = append(reasons, "Sesuai rumpun prodi kamu")
			break
		}
	}

	if candidate.Host != nil {
		if candidate.Host.ContributionPoints >= 20 {
			score += 10
			reasons = append(reasons, fmt.Sprintf("Tutor aktif (%d poin SKPI)", candidate.Host.ContributionPoints))
		} else if candidate.Host.ContributionPoints >= 5 {
			score += 5
		}
	}

	if candidate.StartTime.After(now) && !candidate.StartTime.After(now.Add(7*24*time.Hour)) {
		score += 5
		reasons = append(reasons, "Jadwal minggu ini")
	}

	if len(candidate.Agenda) >= 2 {
		score += 5
	}

	if score > 100 {
		score = 100
	}

	deduped := make([]string, 0, 3)
	seen := make(map[string]bool)
	for _, r := range reasons {
		if r == "" || seen[r] {
			continue
		}
		seen[r] = true
		deduped = append(deduped, r)
		if len(deduped) == 3 {
			break
		}
	}

	return score, deduped
}
