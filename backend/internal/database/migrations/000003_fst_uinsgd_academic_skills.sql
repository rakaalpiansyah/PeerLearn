-- Migration: 000003_fst_uinsgd_academic_skills.sql
-- Kurikulum Akademik Riil Fakultas Sains dan Teknologi (FST) UIN Sunan Gunung Djati Bandung

INSERT INTO skills (name, category) VALUES
    -- 1. Teknik Informatika (FST UIN SGD)
    ('Algoritma & Pemrograman Dasar', 'Teknologi'),
    ('Pemrograman Berorientasi Objek (PBO)', 'Teknologi'),
    ('Basis Data Relasional & SQL', 'Teknologi'),
    ('Rekayasa Perangkat Lunak (RPL)', 'Teknologi'),
    ('Jaringan Komputer & Komunikasi Data', 'Teknologi'),
    ('Sistem Operasi (Linux & Shell)', 'Teknologi'),
    ('Kecerdasan Buatan (Artificial Intelligence)', 'Teknologi'),
    ('Machine Learning & Data Mining', 'Teknologi'),
    ('Pemrograman Web Frontend & Backend', 'Teknologi'),
    ('Pemrograman Mobile (Flutter & Android)', 'Teknologi'),
    ('Kriptografi & Keamanan Informasi', 'Teknologi'),
    ('Teori Graf & Otomata', 'Teknologi'),
    ('Cloud Computing & DevOps', 'Teknologi'),

    -- 2. Teknik Elektro (FST UIN SGD)
    ('Rangkaian Listrik I & II', 'Teknik Elektro'),
    ('Elektronika Analog & Digital', 'Teknik Elektro'),
    ('Sistem Tenaga Listrik & Distribusi', 'Teknik Elektro'),
    ('Sistem Kendali & Kontrol Otomatis', 'Teknik Elektro'),
    ('Mikrokontroler, Embedded System & IoT', 'Teknik Elektro'),
    ('Sinyal & Sistem', 'Teknik Elektro'),
    ('Medan Elektromagnetik', 'Teknik Elektro'),
    ('Instrumentasi & Pengukuran Elektronika', 'Teknik Elektro'),

    -- 3. Teknik Lingkungan (FST UIN SGD)
    ('Kimia Lingkungan & Analisis Kualitas Air', 'Teknik Lingkungan'),
    ('Mikrobiologi Lingkungan', 'Teknik Lingkungan'),
    ('Pengolahan Air Minum & Air Limbah', 'Teknik Lingkungan'),
    ('Pengelolaan Sampah & Limbah B3', 'Teknik Lingkungan'),
    ('Analisis Mengenai Dampak Lingkungan (AMDAL)', 'Teknik Lingkungan'),
    ('Pencemaran Udara & Kebisingan', 'Teknik Lingkungan'),
    ('Drainase Perkotaan & Hidrologi', 'Teknik Lingkungan'),

    -- 4. Matematika (FST UIN SGD)
    ('Kalkulus Diferensial & Integral', 'Matematika'),
    ('Aljabar Linear Elementer & Matriks', 'Matematika'),
    ('Analisis Real & Kompleks', 'Matematika'),
    ('Persamaan Diferensial Biasa & Parsial', 'Matematika'),
    ('Teori Peluang & Statistika Matematika', 'Matematika'),
    ('Matematika Diskrit & Kombinatorika', 'Matematika'),
    ('Metode Numerik & Komputasi Matematika', 'Matematika'),
    ('Riset Operasi & Program Linear', 'Matematika'),

    -- 5. Fisika (FST UIN SGD)
    ('Fisika Dasar Mekanika & Termodinamika', 'Fisika'),
    ('Fisika Dasar Listrik & Magnet', 'Fisika'),
    ('Fisika Modern & Relativitas Khusus', 'Fisika'),
    ('Elektronika Instrumentasi Fisika & Sensor', 'Fisika'),
    ('Mekanika Kuantum', 'Fisika'),
    ('Gelombang, Optik & Fotonika', 'Fisika'),
    ('Fisika Material & Semikonduktor', 'Fisika'),
    ('Fisika Komputasi & Pemodelan Numerik', 'Fisika'),

    -- 6. Kimia (FST UIN SGD)
    ('Kimia Dasar I & II', 'Kimia'),
    ('Kimia Organik & Mekanisme Reaksi', 'Kimia'),
    ('Kimia Anorganik & Senyawa Koordinasi', 'Kimia'),
    ('Kimia Analitik & Titrasi', 'Kimia'),
    ('Kimia Fisika & Termodinamika Kimia', 'Kimia'),
    ('Biokimia & Struktur Biomolekul', 'Kimia'),
    ('Spektroskopi & Instrumentasi Kimia (UV-Vis/FTIR)', 'Kimia'),

    -- 7. Biologi (FST UIN SGD)
    ('Biologi Sel & Biologi Molekuler', 'Biologi'),
    ('Genetika & Pewarisan Sifat', 'Biologi'),
    ('Ekologi & Konservasi Hayati', 'Biologi'),
    ('Mikrobiologi Umum & Terapan', 'Biologi'),
    ('Fisiologi Tumbuhan & Fotosintesis', 'Biologi'),
    ('Fisiologi Hewan & Manusia', 'Biologi'),
    ('Bioteknologi & Kultur Jaringan', 'Biologi'),
    ('Struktur Perkembangan Tumbuhan & Hewan', 'Biologi'),

    -- 8. Agroteknologi (FST UIN SGD)
    ('Dasar-Dasar Agronomi & Budidaya Tanaman', 'Agroteknologi'),
    ('Kesuburan Tanah & Nutrisi Tanaman', 'Agroteknologi'),
    ('Fisiologi Tanaman Pertanian', 'Agroteknologi'),
    ('Perlindungan Tanaman, Hama & Penyakit', 'Agroteknologi'),
    ('Genetika & Pemuliaan Tanaman Tropika', 'Agroteknologi'),
    ('Teknologi Benih & Penanganan Pascapanen', 'Agroteknologi'),
    ('Hidroponik, Green House & Smart Farming', 'Agroteknologi'),

    -- 9. Mata Kuliah Umum, Bahasa & Soft Skills (UIN SGD)
    ('Bahasa Inggris Akademik & TOEFL Prep', 'Bahasa'),
    ('Bahasa Arab Akademik (Kaidah & Terjemah)', 'Bahasa'),
    ('Metodologi Penelitian Ilmiah & Proposal Skripsi', 'Soft Skills'),
    ('Statistika Penelitian & Analisis Data SPSS/R', 'Sains Data'),
    ('Public Speaking & Teknik Presentasi Sidang', 'Soft Skills'),
    ('Kewirausahaan Berbasis Teknologi (Technopreneurship)', 'Soft Skills')
ON CONFLICT (name) DO NOTHING;
