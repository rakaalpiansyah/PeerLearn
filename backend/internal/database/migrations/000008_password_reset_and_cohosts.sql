-- Migration: 000008_password_reset_and_cohosts.sql
-- Purpose: Add OTP-based password reset table and multi-tutor (co-host) table for study groups.

-- 1. Password Reset OTPs (6-digit hashed OTP, 15m TTL, max 5 attempts)
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_created
  ON password_reset_otps(user_id, created_at DESC);

-- 2. Study Group Co-Hosts / Multi-Tutor (prepared for Tahap 2.3)
CREATE TABLE IF NOT EXISTS study_group_cohosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cohosts_group_status
  ON study_group_cohosts(group_id, status);

CREATE INDEX IF NOT EXISTS idx_cohosts_user_status
  ON study_group_cohosts(user_id, status);