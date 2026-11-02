package service_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"peerlearn/backend/internal/domain"
	"peerlearn/backend/internal/repository"
	"peerlearn/backend/internal/service"
)

type mockMessageRepository struct {
	messages []domain.GroupMessageResponse
}

func (m *mockMessageRepository) Create(ctx context.Context, msg *domain.GroupMessage) error {
	m.messages = append(m.messages, domain.GroupMessageResponse{
		ID:        msg.ID,
		GroupID:   msg.GroupID,
		SenderID:  msg.SenderID,
		Message:   msg.Message,
		CreatedAt: msg.CreatedAt,
	})
	return nil
}

func (m *mockMessageRepository) ListByGroup(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]domain.GroupMessageResponse, error) {
	var list []domain.GroupMessageResponse
	for _, msg := range m.messages {
		if msg.GroupID == groupID {
			list = append(list, msg)
		}
	}
	return list, nil
}

type mockMembershipForMessageRepo struct {
	memberships map[string]*domain.Membership
}

func (m *mockMembershipForMessageRepo) Find(ctx context.Context, groupID, userID uuid.UUID) (*domain.Membership, error) {
	key := groupID.String() + ":" + userID.String()
	mem, ok := m.memberships[key]
	if !ok {
		return nil, repository.ErrMembershipNotFound
	}
	return mem, nil
}

func (m *mockMembershipForMessageRepo) Create(ctx context.Context, membership *domain.Membership) error {
	return nil
}
func (m *mockMembershipForMessageRepo) FindByID(ctx context.Context, id uuid.UUID) (*domain.Membership, error) {
	return nil, nil
}
func (m *mockMembershipForMessageRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.MembershipStatus) error {
	return nil
}
func (m *mockMembershipForMessageRepo) ListByGroup(ctx context.Context, groupID uuid.UUID) ([]domain.Membership, error) {
	return nil, nil
}
func (m *mockMembershipForMessageRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Membership, error) {
	return nil, nil
}
func (m *mockMembershipForMessageRepo) CountAccepted(ctx context.Context, groupID uuid.UUID) (int, error) {
	return 1, nil
}

func TestMessageService_SendMessageAndAuthorization(t *testing.T) {
	ctx := context.Background()

	hostID := uuid.New()
	acceptedMemberID := uuid.New()
	pendingUserID := uuid.New()
	strangerID := uuid.New()

	groupRepo := newMockGroupRepository()
	msgRepo := &mockMessageRepository{}
	memRepo := &mockMembershipForMessageRepo{
		memberships: make(map[string]*domain.Membership),
	}

	// Create test group
	groupID := uuid.New()
	group := &domain.LearningGroup{
		ID:          groupID,
		HostID:      hostID,
		Title:       "Diskusi Algoritma",
		Status:      domain.StatusOpen,
		MaxCapacity: 5,
	}
	_ = groupRepo.Create(ctx, group)

	// Set memberships
	memRepo.memberships[groupID.String()+":"+acceptedMemberID.String()] = &domain.Membership{
		ID:      uuid.New(),
		GroupID: groupID,
		UserID:  acceptedMemberID,
		Status:  domain.MembershipAccepted,
	}
	memRepo.memberships[groupID.String()+":"+pendingUserID.String()] = &domain.Membership{
		ID:      uuid.New(),
		GroupID: groupID,
		UserID:  pendingUserID,
		Status:  domain.MembershipPending,
	}

	msgService := service.NewMessageService(msgRepo, groupRepo, memRepo)

	// 1. Host should be allowed to send message
	hostMsg, err := msgService.SendMessage(ctx, hostID, groupID, "Halo semua, selamat datang di sesi ini!")
	if err != nil {
		t.Fatalf("Host should be authorized to send message, got error: %v", err)
	}
	if hostMsg.Message != "Halo semua, selamat datang di sesi ini!" {
		t.Errorf("Unexpected message content: %s", hostMsg.Message)
	}

	// 2. Accepted member should be allowed to send message
	memMsg, err := msgService.SendMessage(ctx, acceptedMemberID, groupID, "Terima kasih kak, materi apa yang perlu dipelajari duluan?")
	if err != nil {
		t.Fatalf("Accepted member should be authorized to send message, got error: %v", err)
	}
	if memMsg.Message != "Terima kasih kak, materi apa yang perlu dipelajari duluan?" {
		t.Errorf("Unexpected message content: %s", memMsg.Message)
	}

	// 3. Pending member should be REJECTED
	_, err = msgService.SendMessage(ctx, pendingUserID, groupID, "Bolehkah saya ikut?")
	if err != service.ErrUnauthorizedAction {
		t.Errorf("Expected ErrUnauthorizedAction for pending member, got: %v", err)
	}

	// 4. Stranger should be REJECTED
	_, err = msgService.SendMessage(ctx, strangerID, groupID, "Spam message")
	if err != service.ErrUnauthorizedAction {
		t.Errorf("Expected ErrUnauthorizedAction for stranger, got: %v", err)
	}

	// 5. Empty message should be rejected
	_, err = msgService.SendMessage(ctx, hostID, groupID, "   ")
	if err == nil {
		t.Errorf("Expected error for empty message, got nil")
	}

	// 6. Reading messages - accepted member & host should see all 2 messages
	messages, err := msgService.GetMessages(ctx, acceptedMemberID, groupID)
	if err != nil {
		t.Fatalf("Failed to get messages: %v", err)
	}
	if len(messages) != 2 {
		t.Errorf("Expected 2 messages, got %d", len(messages))
	}

	// 7. Reading messages - stranger should be REJECTED
	_, err = msgService.GetMessages(ctx, strangerID, groupID)
	if err != service.ErrUnauthorizedAction {
		t.Errorf("Expected ErrUnauthorizedAction for stranger reading messages, got: %v", err)
	}
}
