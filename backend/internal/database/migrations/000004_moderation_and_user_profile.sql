-- Migration: 000004_moderation_and_user_profile.sql
-- Purpose: Support client-compressed avatars (TEXT), user gender, account status (active, restricted, suspended),
-- and moderation indexes.

-- 1. Expand users table for text avatars, gender, and moderation status
ALTER TABLE users
  ALTER COLUMN avatar_url TYPE TEXT,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS restriction_note TEXT NOT NULL DEFAULT '';

-- 2. Index on reports for auto-restriction lookups
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_created
  ON reports(reported_user_id, created_at DESC);

-- 3. Normalize outdated mock campus labels to FST UIN SGD Bandung
UPDATE users
SET campus_name = 'UIN SGD Bandung - S1 Teknik Informatika'
WHERE campus_name ILIKE '%Universitas Indonesia%';

UPDATE learning_groups
SET location_or_link = 'Gedung FST Kampus 1 Cipadung (Lt. 3 Lab Komputer)'
WHERE location_or_link ILIKE '%Fakultas Ilmu Komputer UI%';

-- 4. Seed Academic Admin Account for FST UIN SGD Bandung
-- Email: admin.fst@uinsgd.ac.id | Password: password123 | Role: admin
INSERT INTO users (email, password_hash, full_name, role, campus_name, gender, bio, account_status)
VALUES (
  'admin.fst@uinsgd.ac.id',
  '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
  'Admin Akademik FST UIN SGD',
  'admin',
  'UIN Sunan Gunung Djati Bandung - Dekanat FST',
  'Laki-laki',
  'Tim Moderasi & Penjaminan Mutu Komunitas Belajar Sebaya FST UIN Sunan Gunung Djati Bandung.',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  account_status = 'active',
  gender = EXCLUDED.gender,
  campus_name = EXCLUDED.campus_name;
