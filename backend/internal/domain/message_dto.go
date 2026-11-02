package domain

import (
	"time"

	"github.com/google/uuid"
)

type SendMessageRequest struct {
	Message string `json:"message"`
}

type GroupMessageResponse struct {
	ID        uuid.UUID     `json:"id"`
	GroupID   uuid.UUID     `json:"group_id"`
	SenderID  uuid.UUID     `json:"sender_id"`
	Message   string        `json:"message"`
	CreatedAt time.Time     `json:"created_at"`
	Sender    *UserResponse `json:"sender,omitempty"`
}
