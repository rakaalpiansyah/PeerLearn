package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"peerlearn/backend/internal/domain"
)

type MessageRepository interface {
	Create(ctx context.Context, msg *domain.GroupMessage) error
	ListByGroup(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]domain.GroupMessageResponse, error)
	FindByID(ctx context.Context, messageID uuid.UUID) (*domain.GroupMessage, error)
	ToggleReaction(ctx context.Context, messageID, userID uuid.UUID, emoji string) (bool, error)
	GetReactionsByMessageIDs(ctx context.Context, messageIDs []uuid.UUID) (map[uuid.UUID][]domain.ReactionSummary, error)
	SetPinStatus(ctx context.Context, groupID, messageID uuid.UUID, isPinned bool) error
}

type messageRepository struct {
	pool *pgxpool.Pool
}

func NewMessageRepository(pool *pgxpool.Pool) MessageRepository {
	return &messageRepository{pool: pool}
}

func (r *messageRepository) Create(ctx context.Context, msg *domain.GroupMessage) error {
	query := `
		INSERT INTO group_messages (id, group_id, sender_id, message, is_pinned, reply_to_message_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	if msg.ID == uuid.Nil {
		msg.ID = uuid.New()
	}
	if msg.CreatedAt.IsZero() {
		msg.CreatedAt = time.Now().UTC()
	}

	_, err := r.pool.Exec(ctx, query, msg.ID, msg.GroupID, msg.SenderID, msg.Message, msg.IsPinned, msg.ReplyToMessageID, msg.CreatedAt)
	if err != nil {
		return fmt.Errorf("messageRepository.Create: %w", err)
	}
	return nil
}

func (r *messageRepository) FindByID(ctx context.Context, messageID uuid.UUID) (*domain.GroupMessage, error) {
	query := `
		SELECT id, group_id, sender_id, message, is_pinned, reply_to_message_id, created_at
		FROM group_messages
		WHERE id = $1
	`
	var msg domain.GroupMessage
	err := r.pool.QueryRow(ctx, query, messageID).Scan(
		&msg.ID,
		&msg.GroupID,
		&msg.SenderID,
		&msg.Message,
		&msg.IsPinned,
		&msg.ReplyToMessageID,
		&msg.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("messageRepository.FindByID: %w", err)
	}
	return &msg, nil
}

func (r *messageRepository) ToggleReaction(ctx context.Context, messageID, userID uuid.UUID, emoji string) (bool, error) {
	// 1. Try to delete if existing
	delQuery := `
		DELETE FROM group_message_reactions
		WHERE message_id = $1 AND user_id = $2 AND emoji = $3
	`
	tag, err := r.pool.Exec(ctx, delQuery, messageID, userID, emoji)
	if err != nil {
		return false, fmt.Errorf("messageRepository.ToggleReaction delete: %w", err)
	}
	if tag.RowsAffected() > 0 {
		return false, nil // Removed reaction
	}

	// 2. Insert new reaction
	insQuery := `
		INSERT INTO group_message_reactions (id, message_id, user_id, emoji, created_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (message_id, user_id, emoji) DO NOTHING
	`
	_, err = r.pool.Exec(ctx, insQuery, uuid.New(), messageID, userID, emoji, time.Now().UTC())
	if err != nil {
		return false, fmt.Errorf("messageRepository.ToggleReaction insert: %w", err)
	}
	return true, nil // Added reaction
}

func (r *messageRepository) GetReactionsByMessageIDs(ctx context.Context, messageIDs []uuid.UUID) (map[uuid.UUID][]domain.ReactionSummary, error) {
	result := make(map[uuid.UUID][]domain.ReactionSummary)
	if len(messageIDs) == 0 {
		return result, nil
	}

	query := `
		SELECT message_id, emoji, user_id
		FROM group_message_reactions
		WHERE message_id = ANY($1)
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, messageIDs)
	if err != nil {
		return nil, fmt.Errorf("messageRepository.GetReactionsByMessageIDs: %w", err)
	}
	defer rows.Close()

	type groupKey struct {
		messageID uuid.UUID
		emoji     string
	}
	grouped := make(map[groupKey][]uuid.UUID)
	orderMap := make(map[uuid.UUID][]string)

	for rows.Next() {
		var msgID, userID uuid.UUID
		var emoji string
		if err := rows.Scan(&msgID, &emoji, &userID); err != nil {
			return nil, fmt.Errorf("messageRepository.GetReactionsByMessageIDs scan: %w", err)
		}
		key := groupKey{messageID: msgID, emoji: emoji}
		if _, exists := grouped[key]; !exists {
			orderMap[msgID] = append(orderMap[msgID], emoji)
		}
		grouped[key] = append(grouped[key], userID)
	}

	for msgID, emojis := range orderMap {
		for _, emoji := range emojis {
			userIDs := grouped[groupKey{messageID: msgID, emoji: emoji}]
			result[msgID] = append(result[msgID], domain.ReactionSummary{
				Emoji:   emoji,
				Count:   len(userIDs),
				UserIDs: userIDs,
			})
		}
	}

	return result, nil
}

func (r *messageRepository) SetPinStatus(ctx context.Context, groupID, messageID uuid.UUID, isPinned bool) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("messageRepository.SetPinStatus begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if isPinned {
		// Reset other pins in this group to maintain at most one pinned message
		resetQuery := `UPDATE group_messages SET is_pinned = FALSE WHERE group_id = $1`
		if _, err := tx.Exec(ctx, resetQuery, groupID); err != nil {
			return fmt.Errorf("messageRepository.SetPinStatus reset: %w", err)
		}
		setQuery := `UPDATE group_messages SET is_pinned = TRUE WHERE id = $1 AND group_id = $2`
		if _, err := tx.Exec(ctx, setQuery, messageID, groupID); err != nil {
			return fmt.Errorf("messageRepository.SetPinStatus set: %w", err)
		}
	} else {
		unpinQuery := `UPDATE group_messages SET is_pinned = FALSE WHERE id = $1 AND group_id = $2`
		if _, err := tx.Exec(ctx, unpinQuery, messageID, groupID); err != nil {
			return fmt.Errorf("messageRepository.SetPinStatus unpin: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("messageRepository.SetPinStatus commit tx: %w", err)
	}
	return nil
}

func (r *messageRepository) ListByGroup(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]domain.GroupMessageResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT 
			m.id, m.group_id, m.sender_id, m.message, m.is_pinned, m.reply_to_message_id, m.created_at,
			u.id, u.email, u.full_name, u.role, u.campus_name, u.bio, u.avatar_url, u.contribution_points, u.created_at,
			p.id, p.sender_id, p.message,
			pu.id, pu.email, pu.full_name, pu.avatar_url
		FROM group_messages m
		JOIN users u ON m.sender_id = u.id
		LEFT JOIN group_messages p ON m.reply_to_message_id = p.id
		LEFT JOIN users pu ON p.sender_id = pu.id
		WHERE m.group_id = $1
		ORDER BY m.created_at ASC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, groupID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("messageRepository.ListByGroup: %w", err)
	}
	defer rows.Close()

	var list []domain.GroupMessageResponse
	var messageIDs []uuid.UUID

	for rows.Next() {
		var resp domain.GroupMessageResponse
		var sender domain.UserResponse
		var replyToMsgID *uuid.UUID
		var replyID, replySenderID *uuid.UUID
		var replyMessage *string
		var replyUID *uuid.UUID
		var replyEmail, replyFullName, replyAvatarURL *string

		err := rows.Scan(
			&resp.ID,
			&resp.GroupID,
			&resp.SenderID,
			&resp.Message,
			&resp.IsPinned,
			&replyToMsgID,
			&resp.CreatedAt,
			&sender.ID,
			&sender.Email,
			&sender.FullName,
			&sender.Role,
			&sender.CampusName,
			&sender.Bio,
			&sender.AvatarURL,
			&sender.ContributionPoints,
			&sender.CreatedAt,
			&replyID,
			&replySenderID,
			&replyMessage,
			&replyUID,
			&replyEmail,
			&replyFullName,
			&replyAvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("messageRepository.ListByGroup scan: %w", err)
		}

		resp.Sender = &sender
		resp.Reactions = []domain.ReactionSummary{}

		if replyID != nil && replyMessage != nil {
			quoted := &domain.QuotedMessageResponse{
				ID:       *replyID,
				Message:  *replyMessage,
			}
			if replySenderID != nil {
				quoted.SenderID = *replySenderID
			}
			if replyUID != nil && replyFullName != nil {
				quoted.Sender = &domain.UserResponse{
					ID:       *replyUID,
					FullName: *replyFullName,
				}
				if replyAvatarURL != nil {
					quoted.Sender.AvatarURL = *replyAvatarURL
				}
				if replyEmail != nil {
					quoted.Sender.Email = *replyEmail
				}
			}
			resp.ReplyTo = quoted
		} else {
			resp.ReplyTo = nil
		}

		list = append(list, resp)
		messageIDs = append(messageIDs, resp.ID)
	}

	// Fetch reactions for all messages
	if len(messageIDs) > 0 {
		reactionsMap, err := r.GetReactionsByMessageIDs(ctx, messageIDs)
		if err == nil {
			for i := range list {
				if reactions, found := reactionsMap[list[i].ID]; found {
					list[i].Reactions = reactions
				}
			}
		}
	}

	return list, nil
}
