package domain

import (
	"time"

	"github.com/google/uuid"
)

type SendMessageRequest struct {
	Message          string     `json:"message"`
	ReplyToMessageID *uuid.UUID `json:"reply_to_message_id,omitempty"`
}

type ToggleReactionRequest struct {
	Emoji string `json:"emoji"`
}

type ReactionSummary struct {
	Emoji   string      `json:"emoji"`
	Count   int         `json:"count"`
	UserIDs []uuid.UUID `json:"user_ids"`
	Reacted bool        `json:"reacted"`
}

type QuotedMessageResponse struct {
	ID       uuid.UUID     `json:"id"`
	SenderID uuid.UUID     `json:"sender_id"`
	Message  string        `json:"message"`
	Sender   *UserResponse `json:"sender,omitempty"`
}

type GroupMessageResponse struct {
	ID        uuid.UUID              `json:"id"`
	GroupID   uuid.UUID              `json:"group_id"`
	SenderID  uuid.UUID              `json:"sender_id"`
	Message   string                 `json:"message"`
	IsPinned  bool                   `json:"is_pinned"`
	CreatedAt time.Time              `json:"created_at"`
	Sender    *UserResponse          `json:"sender,omitempty"`
	ReplyTo   *QuotedMessageResponse `json:"reply_to,omitempty"`
	Reactions []ReactionSummary      `json:"reactions"`
}
