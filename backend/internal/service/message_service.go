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
	SendMessage(ctx context.Context, senderID, groupID uuid.UUID, message string) (*domain.GroupMessageResponse, error)
	GetMessages(ctx context.Context, callerID, groupID uuid.UUID) ([]domain.GroupMessageResponse, error)
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

func (s *messageService) SendMessage(ctx context.Context, senderID, groupID uuid.UUID, message string) (*domain.GroupMessageResponse, error) {
	message = strings.TrimSpace(message)
	if message == "" {
		return nil, fmt.Errorf("%w: pesan diskusi tidak boleh kosong", ErrInvalidInput)
	}

	if err := s.checkAccess(ctx, senderID, groupID); err != nil {
		return nil, err
	}

	msg := &domain.GroupMessage{
		ID:        uuid.New(),
		GroupID:   groupID,
		SenderID:  senderID,
		Message:   message,
		CreatedAt: time.Now().UTC(),
	}

	if err := s.msgRepo.Create(ctx, msg); err != nil {
		return nil, fmt.Errorf("messageService.SendMessage: %w", err)
	}

	return &domain.GroupMessageResponse{
		ID:        msg.ID,
		GroupID:   msg.GroupID,
		SenderID:  msg.SenderID,
		Message:   msg.Message,
		CreatedAt: msg.CreatedAt,
	}, nil
}

func (s *messageService) GetMessages(ctx context.Context, callerID, groupID uuid.UUID) ([]domain.GroupMessageResponse, error) {
	if err := s.checkAccess(ctx, callerID, groupID); err != nil {
		return nil, err
	}

	return s.msgRepo.ListByGroup(ctx, groupID, 50, 0)
}
