-- Phase 4B: Study Request Board (Papan Usulan Topik Belajar) & Support Votes
CREATE TABLE IF NOT EXISTS study_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT 'Teknologi',
    preferred_format VARCHAR(20) NOT NULL DEFAULT 'online'
        CHECK (preferred_format IN ('online', 'offline')),
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'fulfilled', 'closed')),
    fulfilled_group_id UUID NULL REFERENCES learning_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_request_votes (
    request_id UUID NOT NULL REFERENCES study_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_study_requests_status_created ON study_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_request_votes_user ON study_request_votes(user_id);
