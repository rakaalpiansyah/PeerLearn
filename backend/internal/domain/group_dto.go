package domain

import (
	"time"

	"github.com/google/uuid"
)

type CreateGroupRequest struct {
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
}

type UpdateGroupRequest struct {
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
}

type GroupFilter struct {
	Category string      `json:"category"`
	Format   GroupFormat `json:"format"`
	Status   GroupStatus `json:"status"`
	Search   string      `json:"search"`
}

type GroupResponse struct {
	ID              uuid.UUID         `json:"id"`
	HostID          uuid.UUID         `json:"host_id"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	Category        string            `json:"category"`
	Format          GroupFormat       `json:"format"`
	LocationOrLink  string            `json:"location_or_link"`
	Latitude        *float64          `json:"latitude,omitempty"`
	Longitude       *float64          `json:"longitude,omitempty"`
	BuildingDetails string            `json:"building_details,omitempty"`
	Agenda          []string          `json:"agenda,omitempty"`
	Prerequisites   string            `json:"prerequisites,omitempty"`
	StartTime       time.Time         `json:"start_time"`
	EndTime         time.Time         `json:"end_time"`
	MaxCapacity     int               `json:"max_capacity"`
	CurrentMembers  int               `json:"current_members"`
	Status          GroupStatus       `json:"status"`
	CreatedAt       time.Time         `json:"created_at"`
	Host            *UserResponse     `json:"host,omitempty"`
	UserMembership  *MembershipStatus `json:"user_membership,omitempty"`
	MatchReason     string            `json:"match_reason,omitempty"`
}

type UpdateMembershipStatusRequest struct {
	Status MembershipStatus `json:"status"`
}

type CreateFeedbackRequest struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

type CreateReportRequest struct {
	ReportedUserID *uuid.UUID `json:"reported_user_id,omitempty"`
	TargetGroupID  *uuid.UUID `json:"target_group_id,omitempty"`
	Reason         string     `json:"reason"`
	Details        string     `json:"details"`
}

type UpdateReportStatusRequest struct {
	Status ReportStatus `json:"status"`
}

type ModerationReportItem struct {
	Report             Report         `json:"report"`
	Reporter           *UserResponse  `json:"reporter,omitempty"`
	ReportedUser       *UserResponse  `json:"reported_user,omitempty"`
	TargetGroup        *GroupResponse `json:"target_group,omitempty"`
	WeeklyReportsCount int            `json:"weekly_reports_count"`
}

type ResolveMapLinkRequest struct {
	URL string `json:"url"`
}

type MapLocationResolution struct {
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	PlaceName   string  `json:"place_name,omitempty"`
	ResolvedURL string  `json:"resolved_url,omitempty"`
}
