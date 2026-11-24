package domain

import (
	"time"

	"github.com/google/uuid"
)

type StudyRequestStatus string

const (
	StudyRequestOpen      StudyRequestStatus = "open"
	StudyRequestFulfilled StudyRequestStatus = "fulfilled"
	StudyRequestClosed    StudyRequestStatus = "closed"
)

type StudyRequest struct {
	ID               uuid.UUID          `json:"id"`
	RequesterID      uuid.UUID          `json:"requester_id"`
	Title            string             `json:"title"`
	Description      string             `json:"description"`
	Category         string             `json:"category"`
	PreferredFormat  GroupFormat        `json:"preferred_format"`
	Status           StudyRequestStatus `json:"status"`
	FulfilledGroupID *uuid.UUID         `json:"fulfilled_group_id,omitempty"`
	CreatedAt        time.Time          `json:"created_at"`
	UpdatedAt        time.Time          `json:"updated_at"`
}

type StudyRequestResponse struct {
	ID               uuid.UUID          `json:"id"`
	RequesterID      uuid.UUID          `json:"requester_id"`
	Title            string             `json:"title"`
	Description      string             `json:"description"`
	Category         string             `json:"category"`
	PreferredFormat  GroupFormat        `json:"preferred_format"`
	Status           StudyRequestStatus `json:"status"`
	FulfilledGroupID *uuid.UUID         `json:"fulfilled_group_id,omitempty"`
	VoteCount        int                `json:"vote_count"`
	UserVoted        bool               `json:"user_voted"`
	CreatedAt        time.Time          `json:"created_at"`
	Requester        *UserResponse      `json:"requester,omitempty"`
}

type CreateStudyRequestPayload struct {
	Title           string      `json:"title"`
	Description     string      `json:"description"`
	Category        string      `json:"category"`
	PreferredFormat GroupFormat `json:"preferred_format"`
}

type StudyRequestFilter struct {
	Category string             `json:"category"`
	Status   StudyRequestStatus `json:"status"`
	Search   string             `json:"search"`
}

type StudyRequestVoteResult struct {
	RequestID uuid.UUID `json:"request_id"`
	Voted     bool      `json:"voted"`
	VoteCount int       `json:"vote_count"`
}
