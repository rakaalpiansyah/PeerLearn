package domain

import (
	"time"

	"github.com/google/uuid"
)

type RegisterRequest struct {
	Email      string   `json:"email"`
	Password   string   `json:"password"`
	FullName   string   `json:"full_name"`
	Role       UserRole `json:"role"`
	CampusName string   `json:"campus_name"`
	Gender     string   `json:"gender"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserResponse struct {
	ID                 uuid.UUID     `json:"id"`
	Email              string        `json:"email"`
	FullName           string        `json:"full_name"`
	Role               UserRole      `json:"role"`
	CampusName         string        `json:"campus_name"`
	Gender             string        `json:"gender"`
	Bio                string        `json:"bio"`
	AvatarURL          string        `json:"avatar_url"`
	ContributionPoints int           `json:"contribution_points"`
	AccountStatus      AccountStatus `json:"account_status"`
	RestrictionNote    string        `json:"restriction_note,omitempty"`
	CreatedAt          time.Time     `json:"created_at"`
	Skills             []UserSkill   `json:"skills,omitempty"`
}

type PublicProfileResponse struct {
	ID                 uuid.UUID     `json:"id"`
	FullName           string        `json:"full_name"`
	Role               UserRole      `json:"role"`
	CampusName         string        `json:"campus_name"`
	Gender             string        `json:"gender"`
	Bio                string        `json:"bio"`
	AvatarURL          string        `json:"avatar_url"`
	ContributionPoints int           `json:"contribution_points"`
	AccountStatus      AccountStatus `json:"account_status"`
	HostedGroupsCount  int           `json:"hosted_groups_count"`
	Skills             []UserSkill   `json:"skills,omitempty"`
	CreatedAt          time.Time     `json:"created_at"`
}

type SKPISessionRecord struct {
	GroupID       uuid.UUID `json:"group_id"`
	Title         string    `json:"title"`
	Category      string    `json:"category"`
	Role          string    `json:"role"` // "tutor" | "participant"
	StartTime     time.Time `json:"start_time"`
	AttendedCount int       `json:"attended_count"`
}

type SKPIVerificationResponse struct {
	UserID                uuid.UUID           `json:"user_id"`
	FullName              string              `json:"full_name"`
	CampusName            string              `json:"campus_name"`
	ContributionPoints    int                 `json:"contribution_points"`
	MasteredSkills        []string            `json:"mastered_skills"`
	VerifiedHostedCount   int                 `json:"verified_hosted_count"`
	VerifiedAttendedCount int                 `json:"verified_attended_count"`
	CompletedSessions     []SKPISessionRecord `json:"completed_sessions"`
	VerificationCode      string              `json:"verification_code"`
	Verified              bool                `json:"verified"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UpdateProfileRequest struct {
	FullName   string `json:"full_name"`
	CampusName string `json:"campus_name"`
	Gender     string `json:"gender"`
	Bio        string `json:"bio"`
	AvatarURL  string `json:"avatar_url"`
}

type ModerateUserRequest struct {
	Action string `json:"action"` // "restore" | "suspend"
	Note   string `json:"note"`
}

type SkillItemRequest struct {
	SkillID   uuid.UUID `json:"skill_id"`
	SkillType SkillType `json:"skill_type"`
}

type AddCustomSkillRequest struct {
	Name      string    `json:"name"`
	Category  string    `json:"category"`
	SkillType SkillType `json:"skill_type"`
}

type UpdateSkillsRequest struct {
	Skills []SkillItemRequest `json:"skills"`
}

func ToUserResponse(user *User, skills []UserSkill) UserResponse {
	return UserResponse{
		ID:                 user.ID,
		Email:              user.Email,
		FullName:           user.FullName,
		Role:               user.Role,
		CampusName:         user.CampusName,
		Gender:             user.Gender,
		Bio:                user.Bio,
		AvatarURL:          user.AvatarURL,
		ContributionPoints: user.ContributionPoints,
		AccountStatus:      user.AccountStatus,
		RestrictionNote:    user.RestrictionNote,
		CreatedAt:          user.CreatedAt,
		Skills:             skills,
	}
}
