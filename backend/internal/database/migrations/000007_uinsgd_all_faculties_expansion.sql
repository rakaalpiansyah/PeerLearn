-- Migration: 000007_uinsgd_all_faculties_expansion.sql
-- Purpose: Expand PeerLearn academic skills catalog across all 9 faculties of UIN Sunan Gunung Djati Bandung
-- and align administrative scope beyond FST to Kampus 1 Cibiru & Kampus 2 Cimencrang.

INSERT INTO skills (name, category) VALUES
    -- 1. Fakultas Ushuluddin
    ('Ilmu Al-Quran & Tafsir', 'Ushuluddin & Studi Islam'),
    ('Ilmu Hadis & Takhrij', 'Ushuluddin & Studi Islam'),
    ('Aqidah & Filsafat Islam', 'Ushuluddin & Studi Islam'),
    ('Tasawuf & Psikoterapi', 'Ushuluddin & Studi Islam'),
    ('Studi Agama-Agama', 'Ushuluddin & Studi Islam'),

    -- 2. Fakultas Tarbiyah dan Keguruan (FTK)
    ('Perencanaan Pembelajaran & Kurikulum', 'Pendidikan & Tarbiyah'),
    ('Evaluasi Pendidikan', 'Pendidikan & Tarbiyah'),
    ('Pendidikan Agama Islam (PAI)', 'Pendidikan & Tarbiyah'),
    ('Manajemen Pendidikan Islam', 'Pendidikan & Tarbiyah'),
    ('Microteaching & Media Ajar', 'Pendidikan & Tarbiyah'),

    -- 3. Fakultas Syariah dan Hukum (FSH)
    ('Fiqh Muamalah & Hukum Ekonomi Syariah', 'Hukum & Syariah'),
    ('Hukum Tata Negara (Siyasah)', 'Hukum & Syariah'),
    ('Hukum Keluarga Islam', 'Hukum & Syariah'),
    ('Ilmu Hukum & Peradilan', 'Hukum & Syariah'),
    ('Ushul Fiqh & Qawaid Fiqhiyyah', 'Hukum & Syariah'),

    -- 4. Fakultas Dakwah dan Komunikasi (FDK)
    ('Ilmu Komunikasi & Jurnalistik', 'Komunikasi & Dakwah'),
    ('Hubungan Masyarakat (Public Relations)', 'Komunikasi & Dakwah'),
    ('Manajemen Dakwah', 'Komunikasi & Dakwah'),
    ('Bimbingan Konseling Islam', 'Komunikasi & Dakwah'),
    ('Penyiaran & Produksi Media', 'Komunikasi & Dakwah'),

    -- 5. Fakultas Adab dan Humaniora (FAH)
    ('Sejarah Peradaban Islam', 'Adab & Humaniora'),
    ('Bahasa & Sastra Arab', 'Adab & Humaniora'),
    ('Sastra Inggris & Linguistik', 'Adab & Humaniora'),
    ('Filologi & Kajian Naskah Nusantara', 'Adab & Humaniora'),

    -- 6. Fakultas Psikologi
    ('Psikologi Umum & Perkembangan', 'Psikologi & Konseling'),
    ('Psikologi Klinis & Kesehatan Mental', 'Psikologi & Konseling'),
    ('Psikologi Industri & Organisasi', 'Psikologi & Konseling'),
    ('Asesmen & Psikometri', 'Psikologi & Konseling'),
    ('Statistika Psikologi', 'Psikologi & Konseling'),

    -- 7. Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)
    ('Administrasi Publik & Kebijakan', 'Ilmu Sosial & Politik'),
    ('Ilmu Politik & Pemerintahan', 'Ilmu Sosial & Politik'),
    ('Sosiologi Masyarakat Kontemporer', 'Ilmu Sosial & Politik'),
    ('Metode Penelitian Sosial', 'Ilmu Sosial & Politik'),

    -- 8. Fakultas Ekonomi dan Bisnis Islam (FEBI)
    ('Ekonomi Mikro & Makro Syariah', 'Ekonomi & Bisnis Islam'),
    ('Akuntansi Syariah & Laporan Keuangan', 'Ekonomi & Bisnis Islam'),
    ('Manajemen Keuangan & Investasi', 'Ekonomi & Bisnis Islam'),
    ('Perbankan Syariah & Lembaga Keuangan', 'Ekonomi & Bisnis Islam'),
    ('Pemasaran Digital & Kewirausahaan', 'Ekonomi & Bisnis Islam')
ON CONFLICT (name) DO NOTHING;

-- Align seeded admin scope to UIN Sunan Gunung Djati Bandung (Kampus 1 & 2) while keeping login credentials intact
UPDATE users
SET campus_name = 'UIN Sunan Gunung Djati Bandung - Kampus 1 & 2',
    bio = 'Tim Moderasi & Penjaminan Mutu Komunitas Belajar Sebaya UIN Sunan Gunung Djati Bandung.'
WHERE email = 'admin.fst@uinsgd.ac.id'
  AND campus_name LIKE '%Dekanat FST%';

UPDATE users
SET campus_name = 'UIN Sunan Gunung Djati Bandung - Kemahasiswaan',
    bio = 'Koordinator Bidang Kemahasiswaan, SKPI, dan Penjaminan Mutu Peer-Assisted Learning UIN SGD Bandung.'
WHERE email = 'wakildekan3.fst@uinsgd.ac.id'
  AND campus_name LIKE '%Dekanat FST%';
