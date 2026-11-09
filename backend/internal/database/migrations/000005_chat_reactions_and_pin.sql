-- Migration: 000005_chat_reactions_and_pin.sql
-- Purpose: Add support for pinned announcements, reply/quote messages, and emoji reactions in group discussions.

-- 1. Tambah is_pinned dan reply_to_message_id pada group_messages
ALTER TABLE group_messages 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES group_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_group_messages_pinned 
ON group_messages(group_id) WHERE is_pinned = TRUE;

CREATE INDEX IF NOT EXISTS idx_group_messages_reply_to 
ON group_messages(reply_to_message_id);

-- 2. Buat tabel group_message_reactions
CREATE TABLE IF NOT EXISTS group_message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message 
ON group_message_reactions(message_id);
