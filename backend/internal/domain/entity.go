package domain

import (
	"strings"
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
	EmailVerified      bool          `json:"email_verified"`
	EmailVerifiedAt    *time.Time    `json:"email_verified_at,omitempty"`
	CreatedAt          time.Time     `json:"created_at"`
	UpdatedAt          time.Time     `json:"updated_at"`
}

func IsCampusEmail(email string) bool {
	normalized := strings.TrimSpace(strings.ToLower(email))
	return strings.HasSuffix(normalized, "@uinsgd.ac.id") || strings.HasSuffix(normalized, "@student.uinsgd.ac.id")
}

type AuthToken struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	TokenHash string     `json:"-"`
	Purpose   string     `json:"purpose"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
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
	StatusPendingApproval GroupStatus = "pending_approval"
	StatusRejected        GroupStatus = "rejected"
	StatusOpen            GroupStatus = "open"
	StatusOngoing         GroupStatus = "ongoing"
	StatusCompleted       GroupStatus = "completed"
	StatusCancelled       GroupStatus = "cancelled"
)

type LearningGroup struct {
	ID              uuid.UUID   `json:"id"`
	HostID          uuid.UUID   `json:"host_id"`
	Title           string      `json:"title"`
	Description     string      `json:"description"`
	Category        string      `json:"category"`
	Format          GroupFormat `json:"format"`
	LocationOrLink  string      `json:"location_or_link"`
	Latitude        *float64    `json:"latitude,omitempty"`
	Longitude       *float64    `json:"longitude,omitempty"`
	BuildingDetails string      `json:"building_details,omitempty"`
	Agenda          []string    `json:"agenda,omitempty"`
	Prerequisites   string      `json:"prerequisites,omitempty"`
	StartTime       time.Time   `json:"start_time"`
	EndTime         time.Time   `json:"end_time"`
	MaxCapacity     int         `json:"max_capacity"`
	Status          GroupStatus `json:"status"`
	ReviewNote      string      `json:"review_note,omitempty"`
	ReviewedBy      *uuid.UUID  `json:"reviewed_by,omitempty"`
	ReviewedAt      *time.Time  `json:"reviewed_at,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	Host            *User       `json:"host,omitempty"`
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
	MembershipPending    MembershipStatus = "pending"
	MembershipAccepted   MembershipStatus = "accepted"
	MembershipRejected   MembershipStatus = "rejected"
	MembershipCancelled  MembershipStatus = "cancelled"
	MembershipAttended   MembershipStatus = "attended"
	MembershipWaitlisted MembershipStatus = "waitlisted"
)

type GroupCoHost struct {
	GroupID   uuid.UUID     `json:"group_id"`
	UserID    uuid.UUID     `json:"user_id"`
	AddedBy   *uuid.UUID    `json:"added_by,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
	User      *UserResponse `json:"user,omitempty"`
}

type GroupMaterial struct {
	ID           uuid.UUID     `json:"id"`
	GroupID      uuid.UUID     `json:"group_id"`
	UploadedBy   uuid.UUID     `json:"uploaded_by"`
	Title        string        `json:"title"`
	URL          string        `json:"url"`
	MaterialType string        `json:"material_type"`
	CreatedAt    time.Time     `json:"created_at"`
	Uploader     *UserResponse `json:"uploader,omitempty"`
}

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

type SupportThreadStatus string

const (
	SupportThreadOpen     SupportThreadStatus = "open"
	SupportThreadResolved SupportThreadStatus = "resolved"
)

type SupportThread struct {
	ID            uuid.UUID           `json:"id"`
	StudentID     uuid.UUID           `json:"student_id"`
	Subject       string              `json:"subject"`
	Status        SupportThreadStatus `json:"status"`
	LastMessageAt time.Time           `json:"last_message_at"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
}

type SupportMessage struct {
	ID        uuid.UUID `json:"id"`
	ThreadID  uuid.UUID `json:"thread_id"`
	SenderID  uuid.UUID `json:"sender_id"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type NotificationType string

const (
	NotificationJoinRequest        NotificationType = "join_request"
	NotificationMembershipAccepted NotificationType = "membership_accepted"
	NotificationMembershipRejected NotificationType = "membership_rejected"
	NotificationAttendanceMarked   NotificationType = "attendance_marked"
	NotificationSessionApproved    NotificationType = "session_approved"
	NotificationSessionRejected    NotificationType = "session_rejected"
	NotificationSessionStatus      NotificationType = "session_status"
	NotificationSupportReply       NotificationType = "support_reply"
	NotificationCoHostAdded        NotificationType = "cohost_added"
	NotificationCoHostRemoved      NotificationType = "cohost_removed"
	NotificationWaitlistJoined     NotificationType = "waitlist_joined"
	NotificationWaitlistPromoted   NotificationType = "waitlist_promoted"
	NotificationRequestFulfilled   NotificationType = "request_fulfilled"
)

type Notification struct {
	ID             uuid.UUID        `json:"id"`
	UserID         uuid.UUID        `json:"user_id"`
	Type           NotificationType `json:"type"`
	Title          string           `json:"title"`
	Message        string           `json:"message"`
	RelatedGroupID *uuid.UUID       `json:"related_group_id,omitempty"`
	IsRead         bool             `json:"is_read"`
	CreatedAt      time.Time        `json:"created_at"`
}

type NotificationListResponse struct {
	Notifications []Notification `json:"notifications"`
	UnreadCount   int            `json:"unread_count"`
}
