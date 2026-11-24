package domain

import (
	"time"

	"github.com/google/uuid"
)

type CohostStatus string

const (
	CohostInvited  CohostStatus = "invited"
	CohostAccepted CohostStatus = "accepted"
	CohostDeclined CohostStatus = "declined"
)

type StudyGroupCohost struct {
	ID          uuid.UUID    `json:"id"`
	GroupID     uuid.UUID    `json:"group_id"`
	UserID      uuid.UUID    `json:"user_id"`
	Status      CohostStatus `json:"status"`
	InvitedBy   *uuid.UUID   `json:"invited_by,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
	User        *User        `json:"user,omitempty"`
	GroupTitle  string       `json:"group_title,omitempty"`
	GroupStatus GroupStatus  `json:"group_status,omitempty"`
	StartTime   *time.Time   `json:"start_time,omitempty"`
}

type InviteCohostRequest struct {
	Email string `json:"email"`
}

type RespondCohostRequest struct {
	Status CohostStatus `json:"status"`
}