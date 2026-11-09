package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
)

type MessageService interface {
	SendMessage(ctx context.Context, senderID, groupID uuid.UUID, message string, replyToID *uuid.UUID) (*domain.GroupMessageResponse, error)
	GetMessages(ctx context.Context, callerID, groupID uuid.UUID) ([]domain.GroupMessageResponse, error)
	ToggleReaction(ctx context.Context, callerID, groupID, messageID uuid.UUID, emoji string) ([]domain.ReactionSummary, error)
	TogglePinMessage(ctx context.Context, callerID, groupID, messageID uuid.UUID) (*domain.GroupMessageResponse, error)
}

type messageService struct {
	msgRepo        repository.MessageRepository
	groupRepo      repository.GroupRepository
	membershipRepo repository.MembershipRepository
}

func NewMessageService(
	msgRepo repository.MessageRepository,
	groupRepo repository.GroupRepository,
	membershipRepo repository.MembershipRepository,
) MessageService {
	return &messageService{
		msgRepo:        msgRepo,
		groupRepo:      groupRepo,
		membershipRepo: membershipRepo,
	}
}

func (s *messageService) checkAccess(ctx context.Context, userID, groupID uuid.UUID) error {
	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return fmt.Errorf("messageService.checkAccess: %w", err)
	}

	// Host always has access
	if group.HostID == userID {
		return nil
	}

	// Check if user is accepted member
	membership, err := s.membershipRepo.Find(ctx, groupID, userID)
	if err != nil || membership == nil || membership.Status != domain.MembershipAccepted {
		return ErrUnauthorizedAction
	}

	return nil
}

func (s *messageService) SendMessage(ctx context.Context, senderID, groupID uuid.UUID, message string, replyToID *uuid.UUID) (*domain.GroupMessageResponse, error) {
	message = strings.TrimSpace(message)
	if message == "" {
		return nil, fmt.Errorf("%w: pesan diskusi tidak boleh kosong", ErrInvalidInput)
	}
	if len(message) > 2000 {
		return nil, fmt.Errorf("%w: pesan diskusi melebihi batas 2.000 karakter", ErrInvalidInput)
	}

	if err := s.checkAccess(ctx, senderID, groupID); err != nil {
		return nil, err
	}

	var quoted *domain.QuotedMessageResponse
	if replyToID != nil {
		parent, err := s.msgRepo.FindByID(ctx, *replyToID)
		if err != nil || parent == nil || parent.GroupID != groupID {
			return nil, fmt.Errorf("%w: pesan yang dibalas tidak ditemukan di sesi ini", ErrInvalidInput)
		}
		quoted = &domain.QuotedMessageResponse{
			ID:       parent.ID,
			SenderID: parent.SenderID,
			Message:  parent.Message,
		}
	}

	msg := &domain.GroupMessage{
		ID:               uuid.New(),
		GroupID:          groupID,
		SenderID:         senderID,
		Message:          message,
		IsPinned:         false,
		ReplyToMessageID: replyToID,
		CreatedAt:        time.Now().UTC(),
	}

	if err := s.msgRepo.Create(ctx, msg); err != nil {
		return nil, fmt.Errorf("messageService.SendMessage: %w", err)
	}

	return &domain.GroupMessageResponse{
		ID:        msg.ID,
		GroupID:   msg.GroupID,
		SenderID:  msg.SenderID,
		Message:   msg.Message,
		IsPinned:  msg.IsPinned,
		CreatedAt: msg.CreatedAt,
		ReplyTo:   quoted,
		Reactions: []domain.ReactionSummary{},
	}, nil
}

func (s *messageService) GetMessages(ctx context.Context, callerID, groupID uuid.UUID) ([]domain.GroupMessageResponse, error) {
	if err := s.checkAccess(ctx, callerID, groupID); err != nil {
		return nil, err
	}

	messages, err := s.msgRepo.ListByGroup(ctx, groupID, 50, 0)
	if err != nil {
		return nil, err
	}

	// Mark caller reactions as Reacted: true
	for i := range messages {
		for j := range messages[i].Reactions {
			for _, uid := range messages[i].Reactions[j].UserIDs {
				if uid == callerID {
					messages[i].Reactions[j].Reacted = true
					break
				}
			}
		}
	}

	return messages, nil
}

func (s *messageService) ToggleReaction(ctx context.Context, callerID, groupID, messageID uuid.UUID, emoji string) ([]domain.ReactionSummary, error) {
	emoji = strings.TrimSpace(emoji)
	if emoji == "" || len(emoji) > 16 {
		return nil, fmt.Errorf("%w: emoji reaksi tidak valid", ErrInvalidInput)
	}

	if err := s.checkAccess(ctx, callerID, groupID); err != nil {
		return nil, err
	}

	msg, err := s.msgRepo.FindByID(ctx, messageID)
	if err != nil || msg == nil || msg.GroupID != groupID {
		return nil, fmt.Errorf("%w: pesan diskusi tidak ditemukan di sesi ini", ErrInvalidInput)
	}

	if _, err := s.msgRepo.ToggleReaction(ctx, messageID, callerID, emoji); err != nil {
		return nil, fmt.Errorf("messageService.ToggleReaction: %w", err)
	}

	rMap, err := s.msgRepo.GetReactionsByMessageIDs(ctx, []uuid.UUID{messageID})
	if err != nil {
		return nil, fmt.Errorf("messageService.ToggleReaction fetch: %w", err)
	}

	reactions := rMap[messageID]
	if reactions == nil {
		reactions = []domain.ReactionSummary{}
	}

	for i := range reactions {
		for _, uid := range reactions[i].UserIDs {
			if uid == callerID {
				reactions[i].Reacted = true
				break
			}
		}
	}

	return reactions, nil
}

func (s *messageService) TogglePinMessage(ctx context.Context, callerID, groupID, messageID uuid.UUID) (*domain.GroupMessageResponse, error) {
	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("messageService.TogglePinMessage: %w", err)
	}

	// Only host can pin/unpin
	if group.HostID != callerID {
		return nil, ErrUnauthorizedAction
	}

	msg, err := s.msgRepo.FindByID(ctx, messageID)
	if err != nil || msg == nil || msg.GroupID != groupID {
		return nil, fmt.Errorf("%w: pesan diskusi tidak ditemukan di sesi ini", ErrInvalidInput)
	}

	newPinned := !msg.IsPinned
	if err := s.msgRepo.SetPinStatus(ctx, groupID, messageID, newPinned); err != nil {
		return nil, fmt.Errorf("messageService.TogglePinMessage set: %w", err)
	}

	return &domain.GroupMessageResponse{
		ID:        msg.ID,
		GroupID:   msg.GroupID,
		SenderID:  msg.SenderID,
		Message:   msg.Message,
		IsPinned:  newPinned,
		CreatedAt: msg.CreatedAt,
		Reactions: []domain.ReactionSummary{},
	}, nil
}
