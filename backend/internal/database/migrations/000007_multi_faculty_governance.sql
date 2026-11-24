-- Migration: 000007_multi_faculty_governance.sql
-- Purpose: Introduce multi-faculty master tables (faculties, departments, campus_locations),
-- link users and learning_groups to faculty scopes (FST as pilot project + Lintas Fakultas/Umum),
-- and prepare student-led community admin governance (super_admin & faculty_admin).

-- 1. Master Tables for Multi-Faculty Expansion
CREATE TABLE IF NOT EXISTS faculties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    degree_level VARCHAR(20) NOT NULL DEFAULT 'S1',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (faculty_id, name)
);

CREATE TABLE IF NOT EXISTS campus_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
    name VARCHAR(200) UNIQUE NOT NULL,
    short_label VARCHAR(60) NOT NULL DEFAULT '',
    building_details VARCHAR(255) NOT NULL DEFAULT '',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed Pilot Project Faculties (FST + Cross-Faculty General)
INSERT INTO faculties (id, code, name, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'FST', 'Fakultas Sains dan Teknologi', TRUE),
  ('10000000-0000-0000-0000-000000000002', 'UMUM', 'Lintas Fakultas / Umum', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 3. Seed 8 Pilot Departments under FST UIN SGD Bandung
INSERT INTO departments (id, faculty_id, name, degree_level, is_active) VALUES
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Teknik Informatika', 'S1', TRUE),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Teknik Elektro', 'S1', TRUE),
  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Teknik Lingkungan', 'S1', TRUE),
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Matematika', 'S1', TRUE),
  ('11000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Fisika', 'S1', TRUE),
  ('11000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Kimia', 'S1', TRUE),
  ('11000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'Biologi', 'S1', TRUE),
  ('11000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'Agroteknologi', 'S1', TRUE)
ON CONFLICT (faculty_id, name) DO NOTHING;

-- 4. Seed Campus Locations (FST-specific & Shared University Locations)
INSERT INTO campus_locations (id, faculty_id, name, short_label, building_details, latitude, longitude, is_active) VALUES
  (
    '12000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'UIN SGD Bandung: Gedung FST & Lab Kampus 1 Cipadung',
    'FST UIN SGD',
    'Gedung FST Lt. 3 Lab Komputer',
    -6.931754,
    107.717145,
    TRUE
  ),
  (
    '12000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'UIN SGD Bandung: Laboratorium Terpadu MIPA FST',
    'Lab MIPA FST',
    'Lab Fisika, Kimia, & Biologi Terpadu',
    -6.931850,
    107.717300,
    TRUE
  ),
  (
    '12000000-0000-0000-0000-000000000003',
    NULL,
    'UIN SGD Bandung: Perpustakaan Utama Kampus 1',
    'Perpus UIN SGD',
    'Lt. 2 Area Belajar Mandiri / Diskusi',
    -6.932200,
    107.717500,
    TRUE
  ),
  (
    '12000000-0000-0000-0000-000000000004',
    NULL,
    'UIN SGD Bandung: Gedung Kuliah Bersama (GKB) Kampus 1',
    'GKB UIN SGD',
    'Gazebo & Selasar Diskusi Mahasiswa',
    -6.931500,
    107.716800,
    TRUE
  ),
  (
    '12000000-0000-0000-0000-000000000005',
    NULL,
    'UIN SGD Bandung: Kampus 2 (Jl. Soekarno-Hatta)',
    'Kampus 2 Soetta',
    'Gedung Perkuliahan Kampus 2',
    -6.938800,
    107.698000,
    TRUE
  )
ON CONFLICT (name) DO NOTHING;

-- 5. Link users & learning_groups to faculty_id (and optional department_id)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE learning_groups
  ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL;

-- Backfill existing pilot FST users & learning groups to FST faculty
UPDATE users
SET faculty_id = '10000000-0000-0000-0000-000000000001'
WHERE faculty_id IS NULL;

UPDATE users u
SET department_id = d.id
FROM departments d
WHERE u.department_id IS NULL
  AND u.faculty_id = d.faculty_id
  AND u.campus_name ILIKE '%' || d.name || '%';

UPDATE learning_groups
SET faculty_id = '10000000-0000-0000-0000-000000000001'
WHERE faculty_id IS NULL;

-- 6. Indexes for Scoped Filtering & Admin Moderation Performance
CREATE INDEX IF NOT EXISTS idx_users_faculty_role
  ON users(faculty_id, role);

CREATE INDEX IF NOT EXISTS idx_learning_groups_faculty_status_created
  ON learning_groups(faculty_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_departments_faculty
  ON departments(faculty_id, is_active);

CREATE INDEX IF NOT EXISTS idx_campus_locations_faculty
  ON campus_locations(faculty_id, is_active);