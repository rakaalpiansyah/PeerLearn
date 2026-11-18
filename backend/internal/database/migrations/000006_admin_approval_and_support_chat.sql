-- Migration: 000006_admin_approval_and_support_chat.sql
-- Purpose: Add session pre-publication admin approval workflow, shared admin-student support chat,
-- and realistic FST UIN SGD Bandung dummy seed data for approvals, reports, and support chats.

-- 1. Expand learning_groups status workflow and review audit fields
ALTER TABLE learning_groups
  DROP CONSTRAINT IF EXISTS learning_groups_status_check;

ALTER TABLE learning_groups
  ADD CONSTRAINT learning_groups_status_check
  CHECK (status IN ('pending_approval', 'rejected', 'open', 'ongoing', 'completed', 'cancelled'));

ALTER TABLE learning_groups
  ADD COLUMN IF NOT EXISTS review_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_learning_groups_status_created
  ON learning_groups(status, created_at DESC);

-- 2. Create Shared Admin Helpdesk Chat tables (1 thread per student, any admin can reply)
CREATE TABLE IF NOT EXISTS support_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL DEFAULT 'Pertanyaan & Bantuan Akademik',
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_threads_last_msg
  ON support_threads(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_thread_created
  ON support_messages(thread_id, created_at ASC);

-- 3. Seed 2nd Admin Account & 8 Student Accounts across FST UIN SGD Bandung (password: password123)
INSERT INTO users (id, email, password_hash, full_name, role, campus_name, gender, bio, contribution_points, account_status, restriction_note)
VALUES
  (
    'a0000000-0000-0000-0000-000000000002',
    'wakildekan3.fst@uinsgd.ac.id',
    '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
    'Koordinator Kemahasiswaan FST',
    'admin',
    'UIN Sunan Gunung Djati Bandung - Dekanat FST',
    'Perempuan',
    'Koordinator Bidang Kemahasiswaan, SKPI, dan Penjaminan Mutu Peer-Assisted Learning FST.',
    0,
    'active',
    ''
  ),
  (
    'b0000000-0000-0000-0000-000000000001',
    'nabila.azzahra@uinsgd.ac.id',
    '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
    'Nabila Azzahra',
    'student',
    'UIN SGD Bandung - S1 Teknik Informatika',
    'Perempuan',
    'Asisten Laboratorium Basis Data & Pemrograman Berorientasi Objek FST Lt. 3.',
    42,
    'active',
    ''
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'fajar.ramadhan@uinsgd.ac.id',
    '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
    'Fajar Ramadhan',
    'student',
    'UIN SGD Bandung - S1 Teknik Elektro',
    'Laki-laki',
    'Fokus pada mikrokontroler STM32, rangkaian listrik, dan sistem kendali.',
    28,
    'active',
    ''
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'salma.nuraini@uinsgd.ac.id',
    '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
    'Salma Nuraini',
    'student',
    'UIN SGD Bandung - S1 Kimia',
    'Perempuan',
    'Tutor praktikum Kimia Analitik dan instrumentasi FTIR di Lab Terpadu MIPA.',
    35,
    'active',
    ''
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'ilham.maulana@uinsgd.ac.id',
    '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
    'Ilham Maulana',
    'student',
    'UIN SGD Bandung - S1 Matematika',
    'Laki-laki',
    'Mendalami Kalkulus Lanjut, Aljabar Linear Elementer, dan Riset Operasi.',
    31,
    'active',
    ''
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'hana.kamilah@uinsgd.ac.id',
    '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
    'Hana Kamilah',
    'student',
    'UIN SGD Bandung - S1 Biologi',
    'Perempuan',
    'Asisten praktikum Mikrobiologi Umum dan Genetika Molekuler.',
    19,
    'active',
    ''
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'bagus.setiawan@uinsgd.ac.id',
    '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
    'Bagus Setiawan',
    'student',
    'UIN SGD Bandung - S1 Fisika',
    'Laki-laki',
    'Peminat Fisika Komputasi, Termodinamika, dan analisis eksperimen lab.',
    15,
    'active',
    ''
  ),
  (
    'b0000000-0000-0000-0000-000000000007',
    'tiara.puspita@uinsgd.ac.id',
    '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
    'Tiara Puspita',
    'student',
    'UIN SGD Bandung - S1 Teknik Lingkungan',
    'Perempuan',
    'Pengolahan limbah cair domestik, AMDAL, dan pemetaan kualitas air dengan QGIS.',
    22,
    'active',
    ''
  ),
  (
    'b0000000-0000-0000-0000-000000000008',
    'angga.saputra@uinsgd.ac.id',
    '$2a$10$jOX/L0PaW2SQjeEUJ54a8.kJZ8CC60GDwDybAfHMuH/IJV6TSUp5.',
    'Angga Saputra',
    'student',
    'UIN SGD Bandung - S1 Agroteknologi',
    'Laki-laki',
    'Mahasiswa Agroteknologi semester 5.',
    4,
    'restricted',
    'Dibatasi otomatis sementara karena menerima 3 laporan atau lebih dalam 7 hari terakhir. Menunggu peninjauan admin.'
  )
ON CONFLICT (email) DO NOTHING;

-- 4. Seed 10 Session Proposals for Admin Approval Queue (8 pending_approval, 2 rejected)
INSERT INTO learning_groups (
  id, host_id, title, description, category, format, location_or_link,
  latitude, longitude, building_details, agenda, prerequisites,
  start_time, end_time, max_capacity, status, review_note, reviewed_by, reviewed_at
)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Responsi Praktikum Basis Data: Normalisasi & Query Join Kompleks',
    'Persiapan intensif menjelang responsi praktikum Basis Data semester 3. Fokus pada studi kasus perancangan ERD ke 3NF serta optimasi query PostgreSQL.',
    'Teknologi',
    'offline',
    'Gedung FST Kampus 1 Cipadung (Lt. 3 Lab Komputer)',
    -6.931754,
    107.717145,
    'Lab Komputer Basis Data Lt. 3 Ruang 302',
    '["Review aturan 1NF, 2NF, 3NF dengan studi kasus KRS kampus", "Latihan INNER JOIN, LEFT JOIN, dan CTE bertingkat", "Simulasi soal responsi praktikum berbatas waktu"]'::jsonb,
    'Membawa laptop dengan PostgreSQL/DBeaver terpasang dan modul praktikum pertemuan 1-6.',
    '2026-11-21T09:00:00+07:00',
    '2026-11-21T11:30:00+07:00',
    12,
    'pending_approval',
    '',
    NULL,
    NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'Bedah Rangkaian Listrik AC & Analisis Fasor untuk UTS',
    'Diskusi terarah membahas teorema Thevenin-Norton pada domain frekuensi, bilangan kompleks fasor, serta latihan soal UTS tahun-tahun sebelumnya.',
    'Teknik Elektro',
    'offline',
    'Gedung Kuliah Bersama (GKB) Kampus 1 Cipadung',
    -6.931500,
    107.716800,
    'Ruang Diskusi GKB Lt. 2 Sayap Timur',
    '["Konversi domain waktu ke fasor dan impedansi kompleks", "Penerapan metode simpul (nodal) & mesh pada rangkaian AC", "Pembahasan 5 soal UTS Teknik Elektro FST"]'::jsonb,
    'Membawa kalkulator saintifik dan diktat Rangkaian Listrik II.',
    '2026-11-22T13:00:00+07:00',
    '2026-11-22T15:00:00+07:00',
    10,
    'pending_approval',
    '',
    NULL,
    NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'Pre-Test Praktikum Spektrofotometri UV-Vis & Kurva Kalibrasi',
    'Pendampingan mahasiswa Kimia semester 3 dan 5 untuk memahami prinsip hukum Lambert-Beer, pembuatan larutan standar, dan pengolahan regresi linear di Excel.',
    'Kimia',
    'offline',
    'Laboratorium Terpadu MIPA FST UIN SGD',
    -6.931850,
    107.717300,
    'Selasar Lab Kimia Analitik Lt. 2',
    '["Prinsip dasar absorbansi dan panjang gelombang maksimum", "Perhitungan pengenceran bertingkat ppm ke molar", "Pembuatan grafik kurva kalibrasi R-squared di spreadsheet"]'::jsonb,
    'Membawa jas lab (jika masuk ruang preparasi), kalkulator, dan jurnal praktikum.',
    '2026-11-23T10:00:00+07:00',
    '2026-11-23T12:00:00+07:00',
    8,
    'pending_approval',
    '',
    NULL,
    NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'Klinik Kalkulus Integral: Teknik Substitusi Trigonometri & Integral Parsial',
    'Kelas tutorial sebaya bagi mahasiswa tingkat 1 lintas prodi FST yang mengalami kendala menyelesaikan integral tak tentu dan aplikasinya pada luas/volume benda putar.',
    'Matematika',
    'online',
    'https://meet.google.com/fst-kalkulus-2026',
    NULL,
    NULL,
    '',
    '["Identifikasi pola integral parsial (aturan LIATE)", "Substitusi trigonometri dan pecahan parsial", "Kuis interaktif 8 soal secara bersama"]'::jsonb,
    'Sudah memahami turunan dasar fungsi aljabar dan trigonometri.',
    '2026-11-23T19:30:00+07:00',
    '2026-11-23T21:00:00+07:00',
    18,
    'pending_approval',
    '',
    NULL,
    NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'Workshop Pengolahan Data Mikrobiologi & Pewarnaan Gram',
    'Sesi diskusi teknis pembacaan morfologi koloni bakteri, identifikasi hasil pewarnaan Gram, serta tata cara penyusunan laporan praktikum standar jurnal ilmiah.',
    'Biologi',
    'offline',
    'Perpustakaan Utama Kampus 1 UIN SGD',
    -6.932200,
    107.717500,
    'Area Diskusi Kolaboratif Lt. 2 Perpustakaan',
    '["Review perbedaan struktur dinding sel Gram positif vs negatif", "Teknik penghitungan koloni TPC (Total Plate Count)", "Format penulisan pembahasan laporan praktikum"]'::jsonb,
    'Membawa logbook hasil pengamatan mikroskop dan referensi Bergey Manual.',
    '2026-11-24T13:30:00+07:00',
    '2026-11-24T15:30:00+07:00',
    10,
    'pending_approval',
    '',
    NULL,
    NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000006',
    'Fisika Komputasi dengan Python: Metode Numerik Runge-Kutta Orde 4',
    'Implementasi persamaan diferensial biasa untuk simulasi gerak osilasi teredam menggunakan NumPy dan Matplotlib untuk tugas proyek Fisika Dasar dan Komputasi.',
    'Fisika',
    'online',
    'https://meet.google.com/fst-fiskom-rk4',
    NULL,
    NULL,
    '',
    '["Perbandingan metode Euler vs Runge-Kutta Orde 4", "Implementasi kode Python di Google Colab", "Visualisasi grafik fase dan analisis galat numerik"]'::jsonb,
    'Memiliki akun Google untuk menjalankan Google Colab.',
    '2026-11-25T16:00:00+07:00',
    '2026-11-25T18:00:00+07:00',
    15,
    'pending_approval',
    '',
    NULL,
    NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000007',
    'Pemetaan Daerah Aliran Sungai & Kualitas Air Menggunakan QGIS',
    'Pelatihan singkat pembuatan peta kontur dan overlay indeks kualitas air Sungai Citarum menggunakan data terbuka dan QGIS bagi mahasiswa Teknik Lingkungan.',
    'Teknik Lingkungan',
    'online',
    'https://meet.google.com/fst-qgis-lingkungan',
    NULL,
    NULL,
    '',
    '["Impor shapefile administrasi dan DEM SRTM ke QGIS", "Deliniasi batas DAS otomatis dengan modul SAGA/GRASS", "Simbologi peta dan ekspor layout siap masuk laporan"]'::jsonb,
    'QGIS versi 3.28+ sudah terinstal di laptop masing-masing.',
    '2026-11-26T19:00:00+07:00',
    '2026-11-26T21:00:00+07:00',
    16,
    'pending_approval',
    '',
    NULL,
    NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000001',
    'Klinik Tugas Akhir & PKM: Perancangan Sistem IoT Pertanian Presisi',
    'Kolaborasi interdisipliner Teknik Informatika, Teknik Elektro, dan Agroteknologi untuk menyusun proposal PKM-KC dan arsitektur sensor kelembapan tanah berbasis MQTT.',
    'Agroteknologi',
    'offline',
    'Kampus 2 UIN SGD (Jl. Soekarno-Hatta)',
    -6.938800,
    107.698000,
    'Ruang Diskusi Student Center Kampus 2',
    '["Pemetaan masalah budidaya hortikultura & kebutuhan sensor", "Desain arsitektur ESP32 + broker MQTT ke dashboard web", "Bedah rubrik penilaian proposal PKM-KC Belmawa"]'::jsonb,
    'Membawa draft ide singkat atau proposal PKM jika sudah ada.',
    '2026-11-27T14:00:00+07:00',
    '2026-11-27T16:30:00+07:00',
    12,
    'pending_approval',
    '',
    NULL,
    NULL
  ),
  (
    'c0000000-0000-0000-0000-000000000009',
    'b0000000-0000-0000-0000-000000000008',
    'Jasa Pengerjaan Cepat Tugas Statistika & Laporan Praktikum',
    'Bisa bantu kerjakan tugas R dan SPSS dengan cepat sebelum deadline, hubungi lewat grup.',
    'Sains Data',
    'online',
    'https://t.me/contoh-grup-joki',
    NULL,
    NULL,
    '',
    '["Kirim soal tugas", "Pembahasan langsung selesai"]'::jsonb,
    'Tidak ada',
    '2026-11-20T20:00:00+07:00',
    '2026-11-20T21:00:00+07:00',
    20,
    'rejected',
    'Ditolak oleh Admin: PeerLearn melarang keras aktivitas jasa pengerjaan tugas (joki). Ubah kegiatan menjadi bimbingan belajar konseptual yang transparan dan gunakan tautan pertemuan resmi.',
    'a0000000-0000-0000-0000-000000000002',
    '2026-11-17T10:15:00+07:00'
  ),
  (
    'c0000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000006',
    'Belajar Bareng',
    'Nanti bahas fisika kalau sempat.',
    'Fisika',
    'offline',
    'Kantin',
    NULL,
    NULL,
    '',
    '["Ngobrol materi"]'::jsonb,
    '',
    '2026-11-28T15:00:00+07:00',
    '2026-11-28T16:00:00+07:00',
    6,
    'rejected',
    'Mohon lengkapi judul topik spesifik, minimal 2 poin agenda pembahasan terstruktur, dan gunakan preset lokasi kampus FST yang jelas agar peserta mudah menemukan titik kumpul.',
    'a0000000-0000-0000-0000-000000000002',
    '2026-11-17T11:30:00+07:00'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Seed 10 Community Safety Reports (covering pending & resolved cases across users/groups)
INSERT INTO reports (id, reporter_id, reported_user_id, target_group_id, reason, details, status, created_at)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000008',
    'c0000000-0000-0000-0000-000000000009',
    'Indikasi Joki Tugas / Plagiarisme',
    'Menawarkan pengerjaan tugas R dan SPSS dengan imbalan transfer dana di luar platform, melanggar aturan zero-fee dan etika akademik FST.',
    'pending',
    NOW() - INTERVAL '18 hours'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000008',
    'c0000000-0000-0000-0000-000000000009',
    'Pungutan Biaya Komersial',
    'Meminta biaya pendaftaran Rp 35.000 via grup Telegram eksternal saat peserta menanyakan materi.',
    'pending',
    NOW() - INTERVAL '14 hours'
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000008',
    NULL,
    'Spam / Promosi Tidak Relevan',
    'Mengirim tautan promosi eksternal berulang kali di beberapa deskripsi profil dan ajakan chat.',
    'pending',
    NOW() - INTERVAL '9 hours'
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000010',
    'Lokasi & Jadwal Tidak Jelas',
    'Host mencantumkan lokasi tidak spesifik tanpa gedung atau koordinat kampus yang valid sehingga peserta kebingungan.',
    'pending',
    NOW() - INTERVAL '6 hours'
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000006',
    NULL,
    'Ketidakhadiran Host Tanpa Pemberitahuan',
    'Sesi pekan lalu tidak dimulai sesuai jadwal dan host baru memberi kabar dua jam setelah waktu mulai.',
    'pending',
    NOW() - INTERVAL '4 hours'
  ),
  (
    'd0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'Perubahan Ruangan Mendadak',
    'Mohon admin mengingatkan host agar memperbarui detail ruangan GKB di aplikasi apabila pindah gedung.',
    'pending',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'd0000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000004',
    'Tautan Pertemuan Memerlukan Akses',
    'Link Google Meet sebelumnya masih terkunci domain eksternal sebelum diubah ke akses terbuka mahasiswa.',
    'resolved',
    NOW() - INTERVAL '3 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000005',
    'Kapasitas Ruangan Perpustakaan',
    'Ruangan diskusi Lt. 2 penuh oleh kegiatan himpunan, sudah diselesaikan dengan pemindahan ke meja diskusi selatan.',
    'resolved',
    NOW() - INTERVAL '4 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000009',
    'b0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000007',
    'c0000000-0000-0000-0000-000000000007',
    'Kesalahan Kategori Program Studi',
    'Sebelumnya sempat tercatat di kategori Teknologi sebelum diperbaiki menjadi Teknik Lingkungan.',
    'resolved',
    NOW() - INTERVAL '5 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'Keselamatan Laboratorium',
    'Klarifikasi apakah sesi pre-test perlu jas lab. Sudah dikonfirmasi hanya teori di selasar.',
    'resolved',
    NOW() - INTERVAL '6 days'
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Seed 6 Shared Admin-Student Support Threads & Multi-Admin Conversation Messages
INSERT INTO support_threads (id, student_id, subject, status, last_message_at, created_at, updated_at)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Verifikasi Pengajuan Sesi Responsi Basis Data & Peminjaman Lab',
    'open',
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '15 minutes'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000008',
    'Klarifikasi Pembatasan Akun & Revisi Pengajuan Sesi',
    'open',
    NOW() - INTERVAL '45 minutes',
    NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '45 minutes'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Validasi Poin SKPI Tutor Sebaya Teknik Elektro',
    'open',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000003',
    'Pertanyaan Izin Lokasi Selasar Lab Terpadu MIPA',
    'open',
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '4 hours'
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000004',
    'Penambahan Mata Kuliah Pilihan Riset Operasi di Daftar Keahlian',
    'resolved',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
  ),
  (
    'e0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000005',
    'Panduan Kuota Maksimal Peserta Diskusi Perpustakaan',
    'resolved',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO support_messages (id, thread_id, sender_id, message, created_at)
VALUES
  (
    'f0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Assalamualaikum Admin, saya Nabila dari Teknik Informatika. Saya baru mengajukan sesi Responsi Praktikum Basis Data untuk hari Sabtu di Lab Komputer Lt. 3. Mohon bantuannya untuk diperiksa dan di-ACC ya Min.',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'f0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'Waalaikumsalam Nabila. Terima kasih sudah melengkapi agenda dan prasyaratnya. Tim admin sedang mencocokkan jadwal pemakaian Lab Ruang 302 dengan jadwal praktikum reguler hari Sabtu pagi.',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'f0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Baik Bu/Pak, untuk surat izin peminjaman ruangan lab dari asisten laboratorium sudah kami konfirmasi ke teknisi lab. Jika ada catatan revisi silakan kabari di sini.',
    NOW() - INTERVAL '15 minutes'
  ),
  (
    'f0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000008',
    'Permisi Admin, akun saya tiba-tiba berstatus dibatasi dan pengajuan sesi saya ditolak. Saya belum paham bagian mana yang melanggar aturan.',
    NOW() - INTERVAL '5 hours'
  ),
  (
    'f0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000002',
    (SELECT id FROM users WHERE email = 'admin.fst@uinsgd.ac.id' LIMIT 1),
    'Halo Angga. Berdasarkan laporan yang masuk dan pengajuan sesi Anda, tercantum kalimat jasa pengerjaan tugas dan pungutan biaya di grup eksternal. PeerLearn hanya memfasilitasi bimbingan belajar nirlaba tanpa biaya.',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'f0000000-0000-0000-0000-000000000006',
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000008',
    'Oh baik Admin, mohon maaf atas kekeliruannya. Saya siap mengubah konsepnya menjadi diskusi metode statistika gratis dan tidak mencantumkan link Telegram berbayar lagi. Apakah akun saya bisa dipulihkan?',
    NOW() - INTERVAL '45 minutes'
  ),
  (
    'f0000000-0000-0000-0000-000000000007',
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Selamat siang Admin, apakah sertifikat SKPI yang diunduh dari PeerLearn sudah langsung diakui untuk pengajuan poin kemahasiswaan semester ini?',
    NOW() - INTERVAL '1 day'
  ),
  (
    'f0000000-0000-0000-0000-000000000008',
    'e0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000002',
    'Selamat siang Fajar. Ya, dokumen bukti kontribusi Tutor Sebaya mencantumkan nomor registrasi unik yang tervalidasi oleh Kemahasiswaan FST untuk rekapitulasi SKPI yudisium.',
    NOW() - INTERVAL '20 hours'
  ),
  (
    'f0000000-0000-0000-0000-000000000009',
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Terima kasih penjelasannya. Untuk sesi Bedah Rangkaian Listrik AC minggu ini juga sudah saya ajukan di sistem, mohon ACC jika sudah sesuai.',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'f0000000-0000-0000-0000-000000000010',
    'e0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000003',
    'Halo Admin, saya mengajukan sesi Pre-Test Spektrofotometri di selasar Lab Kimia Analitik Lt. 2 (bukan di dalam ruang alat). Apakah tetap aman dari sisi kuota 8 orang?',
    NOW() - INTERVAL '4 hours'
  ),
  (
    'f0000000-0000-0000-0000-000000000011',
    'e0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000004',
    'Admin, apakah mata kuliah Riset Operasi bisa ditambahkan ke menu Keahlian?',
    NOW() - INTERVAL '2 days'
  ),
  (
    'f0000000-0000-0000-0000-000000000012',
    'e0000000-0000-0000-0000-000000000005',
    (SELECT id FROM users WHERE email = 'admin.fst@uinsgd.ac.id' LIMIT 1),
    'Halo Ilham. Anda dapat langsung menggunakan fitur "Pakai Ketik" di modal Keahlian untuk menambahkan mata kuliah Riset Operasi ke rumpun Matematika.',
    NOW() - INTERVAL '1 day'
  ),
  (
    'f0000000-0000-0000-0000-000000000013',
    'e0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000005',
    'Min, kalau diskusi di Perpustakaan Utama Lt. 2 sebaiknya maksimal berapa peserta supaya tidak mengganggu pengunjung lain?',
    NOW() - INTERVAL '3 days'
  ),
  (
    'f0000000-0000-0000-0000-000000000014',
    'e0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000002',
    'Untuk area diskusi kolaboratif perpustakaan kami sarankan 6 sampai 10 peserta per meja diskusi agar tetap kondusif. Pengajuan Anda sudah kami tandai siap ditinjau.',
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;
