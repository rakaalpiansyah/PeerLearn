package domain

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleStudent UserRole = "student"
	RolePublic  UserRole = "public"
	RoleAdmin   UserRole = "admin"
)

type AccountStatus string

const (
	AccountActive     AccountStatus = "active"
	AccountRestricted AccountStatus = "restricted"
	AccountSuspended  AccountStatus = "suspended"
)

type User struct {
	ID                 uuid.UUID     `json:"id"`
	Email              string        `json:"email"`
	PasswordHash       string        `json:"-"`
	FullName           string        `json:"full_name"`
	Role               UserRole      `json:"role"`
	CampusName         string        `json:"campus_name"`
	Gender             string        `json:"gender"`
	Bio                string        `json:"bio"`
	AvatarURL          string        `json:"avatar_url"`
	ContributionPoints int           `json:"contribution_points"`
	AccountStatus      AccountStatus `json:"account_status"`
	RestrictionNote    string        `json:"restriction_note"`
	CreatedAt          time.Time     `json:"created_at"`
	UpdatedAt          time.Time     `json:"updated_at"`
}

type SkillType string

const (
	SkillMastered SkillType = "mastered"
	SkillLearning SkillType = "learning"
)

type Skill struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Category  string    `json:"category"`
	CreatedAt time.Time `json:"created_at"`
}

type UserSkill struct {
	UserID    uuid.UUID `json:"user_id"`
	SkillID   uuid.UUID `json:"skill_id"`
	SkillType SkillType `json:"skill_type"`
	Skill     *Skill    `json:"skill,omitempty"`
}

type GroupFormat string

const (
	FormatOnline  GroupFormat = "online"
	FormatOffline GroupFormat = "offline"
)

type GroupStatus string

const (
	StatusOpen      GroupStatus = "open"
	StatusOngoing   GroupStatus = "ongoing"
	StatusCompleted GroupStatus = "completed"
	StatusCancelled GroupStatus = "cancelled"
)

type LearningGroup struct {
	ID             uuid.UUID   `json:"id"`
	HostID         uuid.UUID   `json:"host_id"`
	Title          string      `json:"title"`
	Description    string      `json:"description"`
	Category       string      `json:"category"`
	Format         GroupFormat `json:"format"`
	LocationOrLink string      `json:"location_or_link"`
	Latitude       *float64    `json:"latitude,omitempty"`
	Longitude      *float64    `json:"longitude,omitempty"`
	BuildingDetails string     `json:"building_details,omitempty"`
	Agenda         []string    `json:"agenda,omitempty"`
	Prerequisites  string      `json:"prerequisites,omitempty"`
	StartTime      time.Time   `json:"start_time"`
	EndTime        time.Time   `json:"end_time"`
	MaxCapacity    int         `json:"max_capacity"`
	Status         GroupStatus `json:"status"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
	Host           *User       `json:"host,omitempty"`
}

type GroupMessage struct {
	ID                 uuid.UUID  `json:"id"`
	GroupID            uuid.UUID  `json:"group_id"`
	SenderID           uuid.UUID  `json:"sender_id"`
	Message            string     `json:"message"`
	IsPinned           bool       `json:"is_pinned"`
	ReplyToMessageID   *uuid.UUID `json:"reply_to_message_id,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	Sender             *User      `json:"sender,omitempty"`
}

type MessageReaction struct {
	ID        uuid.UUID `json:"id"`
	MessageID uuid.UUID `json:"message_id"`
	UserID    uuid.UUID `json:"user_id"`
	Emoji     string    `json:"emoji"`
	CreatedAt time.Time `json:"created_at"`
	User      *User     `json:"user,omitempty"`
}

type MembershipStatus string

const (
	MembershipPending   MembershipStatus = "pending"
	MembershipAccepted  MembershipStatus = "accepted"
	MembershipRejected  MembershipStatus = "rejected"
	MembershipCancelled MembershipStatus = "cancelled"
	MembershipAttended  MembershipStatus = "attended"
)

type Membership struct {
	ID        uuid.UUID        `json:"id"`
	GroupID   uuid.UUID        `json:"group_id"`
	UserID    uuid.UUID        `json:"user_id"`
	Status    MembershipStatus `json:"status"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	User      *User            `json:"user,omitempty"`
}

type Feedback struct {
	ID          uuid.UUID `json:"id"`
	GroupID     uuid.UUID `json:"group_id"`
	ReviewerID  uuid.UUID `json:"reviewer_id"`
	Rating      int       `json:"rating"`
	Comment     string    `json:"comment"`
	CreatedAt   time.Time `json:"created_at"`
	Reviewer    *User     `json:"reviewer,omitempty"`
}

type ReportStatus string

const (
	ReportPending  ReportStatus = "pending"
	ReportReviewed ReportStatus = "reviewed"
	ReportResolved ReportStatus = "resolved"
)

type Report struct {
	ID             uuid.UUID    `json:"id"`
	ReporterID     uuid.UUID    `json:"reporter_id"`
	ReportedUserID *uuid.UUID   `json:"reported_user_id,omitempty"`
	TargetGroupID  *uuid.UUID   `json:"target_group_id,omitempty"`
	Reason         string       `json:"reason"`
	Details        string       `json:"details"`
	Status         ReportStatus `json:"status"`
	CreatedAt      time.Time    `json:"created_at"`
}
