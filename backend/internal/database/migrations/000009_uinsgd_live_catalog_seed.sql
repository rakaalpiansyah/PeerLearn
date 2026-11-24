-- Migration: 000009_uinsgd_live_catalog_seed.sql
-- Purpose: Ensure live UIN Sunan Gunung Djati Bandung catalog has upcoming open cross-faculty sessions
-- and a completed session with attended verification for public SKPI testing.

INSERT INTO learning_groups (
    id, host_id, title, description, category, format,
    location_or_link, latitude, longitude, building_details, agenda, prerequisites,
    start_time, end_time, max_capacity, status, review_note, reviewed_by, reviewed_at
)
SELECT
    'c0000000-0000-0000-0000-000000000011',
    'b0000000-0000-0000-0000-000000000001',
    'Workshop REST API Go & PostgreSQL untuk Skripsi FST',
    'Sesi diskusi teknis merancang Clean Architecture Go dan query teroptimasi pada PostgreSQL untuk proyek tugas akhir mahasiswa UIN SGD Bandung.',
    'Teknologi',
    'offline',
    'UIN SGD Kampus 1: Gedung FST & Lab Komputer',
    -6.931754,
    107.717145,
    'Gedung FST Lt. 3 Lab Komputer',
    '["Struktur Clean Architecture Handler-Service-Repository", "Query SQL terindeks dan koneksi pooled", "Simulasi pengujian unit dengan repository mock"]'::jsonb,
    'Membawa laptop dengan Go 1.22+ dan pemahaman dasar SQL.',
    CURRENT_TIMESTAMP + INTERVAL '3 days',
    CURRENT_TIMESTAMP + INTERVAL '3 days 2 hours',
    12,
    'open',
    'Disetujui oleh Tim Admin UIN SGD',
    'a0000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM users WHERE id = 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning_groups (
    id, host_id, title, description, category, format,
    location_or_link, latitude, longitude, building_details, agenda, prerequisites,
    start_time, end_time, max_capacity, status, review_note, reviewed_by, reviewed_at
)
SELECT
    'c0000000-0000-0000-0000-000000000012',
    'b0000000-0000-0000-0000-000000000002',
    'Kajian Fiqh Muamalah & Kontrak Digital Syariah Kampus 1',
    'Diskusi konseptual lintas fakultas membahas akad muamalah klasik dan aplikasinya pada fintech serta transaksi elektronik syariah.',
    'Hukum & Syariah',
    'offline',
    'UIN SGD Kampus 1: Perpustakaan Rachmat Djatnika',
    -6.932200,
    107.717500,
    'Area Diskusi Kolaboratif Lt. 2',
    '["Prinsip dasar akad salam, istishna, dan murabahah", "Studi kasus akad pada platform pembiayaan digital", "Diskusi literatur fikih dan regulasi OJK"]'::jsonb,
    'Membaca ringkasan fatwa DSN-MUI terkait layanan syariah berbasis teknologi.',
    CURRENT_TIMESTAMP + INTERVAL '4 days',
    CURRENT_TIMESTAMP + INTERVAL '4 days 2 hours',
    15,
    'open',
    'Disetujui oleh Tim Admin UIN SGD',
    'a0000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM users WHERE id = 'b0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning_groups (
    id, host_id, title, description, category, format,
    location_or_link, latitude, longitude, building_details, agenda, prerequisites,
    start_time, end_time, max_capacity, status, review_note, reviewed_by, reviewed_at
)
SELECT
    'c0000000-0000-0000-0000-000000000013',
    'b0000000-0000-0000-0000-000000000004',
    'Analisis Laporan Keuangan Syariah & Rasio Profitabilitas FEBI',
    'Kelas tutor sebaya daring membahas pembacaan neraca bank syariah, perhitungan NPF, serta persiapan UAS Manajemen Keuangan Syariah.',
    'Ekonomi & Bisnis Islam',
    'online',
    'https://meet.google.com/uinsgd-febi-rasio',
    NULL,
    NULL,
    '',
    '["Membedah struktur laporan posisi keuangan perbankan syariah", "Latihan hitung rasio CAR, FDR, dan NPF", "Pembahasan studi kasus laporan tahunan"]'::jsonb,
    'Menyiapkan spreadsheet atau kalkulator.',
    CURRENT_TIMESTAMP + INTERVAL '5 days',
    CURRENT_TIMESTAMP + INTERVAL '5 days 2 hours',
    20,
    'open',
    'Disetujui oleh Tim Admin UIN SGD',
    'a0000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM users WHERE id = 'b0000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning_groups (
    id, host_id, title, description, category, format,
    location_or_link, latitude, longitude, building_details, agenda, prerequisites,
    start_time, end_time, max_capacity, status, review_note, reviewed_by, reviewed_at
)
SELECT
    'c0000000-0000-0000-0000-000000000014',
    'b0000000-0000-0000-0000-000000000001',
    'Responsi Struktur Data & Kompleksitas Algoritma (Angkatan 2025)',
    'Sesi responsi terlaksana yang membahas linked list, pohon biner, dan analisis Big-O sebagai dokumentasi kegiatan SKPI tutor sebaya.',
    'Teknologi',
    'offline',
    'UIN SGD Kampus 1: Gedung FST & Lab Komputer',
    -6.931754,
    107.717145,
    'Ruang Seminar FST Lt. 2',
    '["Tracing struktur data tree dan graf", "Latihan analisis kompleksitas waktu dan ruang"]'::jsonb,
    'Membawa catatan kuliah Struktur Data.',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '2 hours',
    12,
    'completed',
    'Disetujui oleh Tim Admin UIN SGD',
    'a0000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP - INTERVAL '9 days'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO memberships (id, group_id, user_id, status)
SELECT
    'e0000000-0000-0000-0000-000000000011',
    'c0000000-0000-0000-0000-000000000014',
    'b0000000-0000-0000-0000-000000000002',
    'attended'
WHERE EXISTS (SELECT 1 FROM learning_groups WHERE id = 'c0000000-0000-0000-0000-000000000014')
  AND EXISTS (SELECT 1 FROM users WHERE id = 'b0000000-0000-0000-0000-000000000002')
ON CONFLICT (group_id, user_id) DO NOTHING;
