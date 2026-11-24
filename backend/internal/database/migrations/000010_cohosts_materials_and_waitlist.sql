-- Phase 4A: Multi-author (co-hosts), session learning materials, and waitlist status constraint
CREATE TABLE IF NOT EXISTS group_cohosts (
    group_id UUID NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_cohosts_user_id ON group_cohosts(user_id);

CREATE TABLE IF NOT EXISTS group_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    material_type VARCHAR(30) NOT NULL DEFAULT 'referensi'
        CHECK (material_type IN ('slide', 'modul', 'catatan', 'rekaman', 'referensi')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_materials_group_created ON group_materials(group_id, created_at DESC);

DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'memberships'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE memberships DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;

    ALTER TABLE memberships
        ADD CONSTRAINT memberships_status_check
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'attended', 'waitlisted'));
END $$;
