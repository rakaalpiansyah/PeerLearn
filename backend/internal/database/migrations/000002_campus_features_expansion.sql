-- Migration: 000002_campus_features_expansion.sql
-- Purpose: Add support for accurate offline location, agenda syllabus, prerequisites, and in-session group chat.

-- 1. Expand learning_groups table
ALTER TABLE learning_groups
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT NULL,
ADD COLUMN IF NOT EXISTS building_details VARCHAR(255) DEFAULT '',
ADD COLUMN IF NOT EXISTS agenda JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS prerequisites TEXT DEFAULT '';

-- 2. Create group_messages table for in-session discussions
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient message retrieval in chronological order
CREATE INDEX IF NOT EXISTS idx_group_messages_group_created 
ON group_messages(group_id, created_at ASC);
