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
	messages  []domain.GroupMessageResponse
	rawMsgs   map[uuid.UUID]*domain.GroupMessage
	reactions map[uuid.UUID]map[string][]uuid.UUID // messageID -> emoji -> []userID
}

func newMockMessageRepository() *mockMessageRepository {
	return &mockMessageRepository{
		rawMsgs:   make(map[uuid.UUID]*domain.GroupMessage),
		reactions: make(map[uuid.UUID]map[string][]uuid.UUID),
	}
}

func (m *mockMessageRepository) Create(ctx context.Context, msg *domain.GroupMessage) error {
	m.rawMsgs[msg.ID] = msg
	resp := domain.GroupMessageResponse{
		ID:        msg.ID,
		GroupID:   msg.GroupID,
		SenderID:  msg.SenderID,
		Message:   msg.Message,
		IsPinned:  msg.IsPinned,
		CreatedAt: msg.CreatedAt,
		Reactions: []domain.ReactionSummary{},
	}
	if msg.ReplyToMessageID != nil {
		if parent, ok := m.rawMsgs[*msg.ReplyToMessageID]; ok {
			resp.ReplyTo = &domain.QuotedMessageResponse{
				ID:       parent.ID,
				SenderID: parent.SenderID,
				Message:  parent.Message,
			}
		}
	}
	m.messages = append(m.messages, resp)
	return nil
}

func (m *mockMessageRepository) FindByID(ctx context.Context, messageID uuid.UUID) (*domain.GroupMessage, error) {
	msg, ok := m.rawMsgs[messageID]
	if !ok {
		return nil, nil
	}
	return msg, nil
}

func (m *mockMessageRepository) ListByGroup(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]domain.GroupMessageResponse, error) {
	var list []domain.GroupMessageResponse
	for _, msg := range m.messages {
		if msg.GroupID == groupID {
			// Populate reactions
			rMap, _ := m.GetReactionsByMessageIDs(ctx, []uuid.UUID{msg.ID})
			if r, found := rMap[msg.ID]; found {
				msg.Reactions = r
			} else {
				msg.Reactions = []domain.ReactionSummary{}
			}
			list = append(list, msg)
		}
	}
	return list, nil
}

func (m *mockMessageRepository) ToggleReaction(ctx context.Context, messageID, userID uuid.UUID, emoji string) (bool, error) {
	if _, ok := m.reactions[messageID]; !ok {
		m.reactions[messageID] = make(map[string][]uuid.UUID)
	}
	userList := m.reactions[messageID][emoji]
	for i, u := range userList {
		if u == userID {
			// Remove reaction
			m.reactions[messageID][emoji] = append(userList[:i], userList[i+1:]...)
			return false, nil
		}
	}
	// Add reaction
	m.reactions[messageID][emoji] = append(userList, userID)
	return true, nil
}

func (m *mockMessageRepository) GetReactionsByMessageIDs(ctx context.Context, messageIDs []uuid.UUID) (map[uuid.UUID][]domain.ReactionSummary, error) {
	res := make(map[uuid.UUID][]domain.ReactionSummary)
	for _, id := range messageIDs {
		if emojiMap, ok := m.reactions[id]; ok {
			var summaries []domain.ReactionSummary
			for emoji, users := range emojiMap {
				if len(users) > 0 {
					summaries = append(summaries, domain.ReactionSummary{
						Emoji:   emoji,
						Count:   len(users),
						UserIDs: users,
					})
				}
			}
			res[id] = summaries
		}
	}
	return res, nil
}

func (m *mockMessageRepository) SetPinStatus(ctx context.Context, groupID, messageID uuid.UUID, isPinned bool) error {
	for id, msg := range m.rawMsgs {
		if msg.GroupID == groupID {
			if isPinned {
				msg.IsPinned = (id == messageID)
			} else if id == messageID {
				msg.IsPinned = false
			}
		}
	}
	for i := range m.messages {
		if m.messages[i].GroupID == groupID {
			if isPinned {
				m.messages[i].IsPinned = (m.messages[i].ID == messageID)
			} else if m.messages[i].ID == messageID {
				m.messages[i].IsPinned = false
			}
		}
	}
	return nil
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
	msgRepo := newMockMessageRepository()
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
	hostMsg, err := msgService.SendMessage(ctx, hostID, groupID, "Halo semua, selamat datang di sesi ini!", nil)
	if err != nil {
		t.Fatalf("Host should be authorized to send message, got error: %v", err)
	}
	if hostMsg.Message != "Halo semua, selamat datang di sesi ini!" {
		t.Errorf("Unexpected message content: %s", hostMsg.Message)
	}

	// 2. Accepted member should be allowed to send message replying to host
	replyID := hostMsg.ID
	memMsg, err := msgService.SendMessage(ctx, acceptedMemberID, groupID, "Terima kasih kak, materi apa yang perlu dipelajari duluan?", &replyID)
	if err != nil {
		t.Fatalf("Accepted member should be authorized to send message with reply, got error: %v", err)
	}
	if memMsg.ReplyTo == nil || memMsg.ReplyTo.ID != hostMsg.ID {
		t.Errorf("Expected quoted reply to match hostMsg.ID")
	}

	// 3. Reply to non-existent or other group message should fail
	fakeReplyID := uuid.New()
	_, err = msgService.SendMessage(ctx, acceptedMemberID, groupID, "Balas pesan gaib", &fakeReplyID)
	if err == nil {
		t.Errorf("Expected error when replying to non-existent message, got nil")
	}

	// 4. Pending member should be REJECTED
	_, err = msgService.SendMessage(ctx, pendingUserID, groupID, "Bolehkah saya ikut?", nil)
	if err != service.ErrUnauthorizedAction {
		t.Errorf("Expected ErrUnauthorizedAction for pending member, got: %v", err)
	}

	// 5. Stranger should be REJECTED
	_, err = msgService.SendMessage(ctx, strangerID, groupID, "Spam message", nil)
	if err != service.ErrUnauthorizedAction {
		t.Errorf("Expected ErrUnauthorizedAction for stranger, got: %v", err)
	}

	// 6. Empty message should be rejected
	_, err = msgService.SendMessage(ctx, hostID, groupID, "   ", nil)
	if err == nil {
		t.Errorf("Expected error for empty message, got nil")
	}

	// 7. Reading messages - accepted member & host should see all 2 messages
	messages, err := msgService.GetMessages(ctx, acceptedMemberID, groupID)
	if err != nil {
		t.Fatalf("Failed to get messages: %v", err)
	}
	if len(messages) != 2 {
		t.Errorf("Expected 2 messages, got %d", len(messages))
	}

	// 8. Reactions - member toggling reaction
	reactions, err := msgService.ToggleReaction(ctx, acceptedMemberID, groupID, hostMsg.ID, "👍")
	if err != nil {
		t.Fatalf("Member should be able to react: %v", err)
	}
	if len(reactions) == 0 || reactions[0].Count != 1 || !reactions[0].Reacted {
		t.Errorf("Expected 1 reaction with Reacted=true, got: %+v", reactions)
	}

	// Member toggling again cancels reaction (toggle off)
	reactions, err = msgService.ToggleReaction(ctx, acceptedMemberID, groupID, hostMsg.ID, "👍")
	if err != nil {
		t.Fatalf("Toggle off reaction failed: %v", err)
	}
	if len(reactions) > 0 && reactions[0].Count != 0 {
		t.Errorf("Expected reaction count 0 after toggle off, got: %+v", reactions)
	}

	// Stranger reaction should be rejected
	_, err = msgService.ToggleReaction(ctx, strangerID, groupID, hostMsg.ID, "🔥")
	if err != service.ErrUnauthorizedAction {
		t.Errorf("Expected ErrUnauthorizedAction for stranger reaction, got: %v", err)
	}

	// 9. Pinning - Host can pin message
	pinnedMsg, err := msgService.TogglePinMessage(ctx, hostID, groupID, hostMsg.ID)
	if err != nil {
		t.Fatalf("Host should be able to pin message: %v", err)
	}
	if !pinnedMsg.IsPinned {
		t.Errorf("Expected message to be pinned")
	}

	// Member trying to pin should be rejected
	_, err = msgService.TogglePinMessage(ctx, acceptedMemberID, groupID, hostMsg.ID)
	if err != service.ErrUnauthorizedAction {
		t.Errorf("Expected ErrUnauthorizedAction for member trying to pin, got: %v", err)
	}
}
