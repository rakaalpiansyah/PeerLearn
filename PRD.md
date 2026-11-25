# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Project: PeerLearn — Platform Kolaborasi Belajar Mahasiswa

### Lingkup Implementasi: Fakultas Sains dan Teknologi (FST), UIN Sunan Gunung Djati Bandung

---

## 1. Dokumen Kontrol & Ringkasan Eksekutif

| Informasi                  | Keterangan                                                                                                                                                                                                                                                                                          |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nama Produk**            | **PeerLearn (FST UIN SGD Edition)**                                                                                                                                                                                                                                                                 |
| **Deskripsi**              | Platform pembelajaran kolaboratif sebaya (_peer-assisted learning_) nir-biaya (_zero-fee_) yang dirancang khusus untuk memfasilitasi mahasiswa 8 Program Studi di lingkungan Fakultas Sains dan Teknologi, UIN Sunan Gunung Djati Bandung.                                                          |
| **Versi Dokumen**          | **2.1 (v2-campus: Multi-Fakultas, OTP Mailer & Multi-Tutor)**                                                                                                                                                                                                                                       |
| **Dokumen Teknis Terkait** | • [Software Requirements Specification (SRS)](./docs/SRS.md)<br>• [Repository Overview (README.md)](./README.md)                                                                                                                                                                                    |
| **Target Pengguna**        | Mahasiswa S1, Asisten Laboratorium, dan Peer Tutor FST UIN SGD Bandung                                                                                                                                                                                                                              |
| **Arsitektur Teknis**      | **Backend:** Golang (Fiber v2, Clean Architecture)<br>**Frontend:** React (Vite SPA), Component-Driven, Tailwind CSS<br>**Basis Data:** PostgreSQL (Neon Tech Serverless, PgBouncer Pooled)<br>**Konektivitas Kampus:** OpenStreetMap & Geolocation GPS Kampus 1 Cipadung & Kampus 2 Soekarno-Hatta |

---

## 2. Latar Belakang & Analisis Kebutuhan FST UIN SGD Bandung

Fakultas Sains dan Teknologi (FST) UIN Sunan Gunung Djati Bandung menaungi 8 program studi sarjana:

1. **S1 Teknik Informatika**
2. **S1 Teknik Elektro**
3. **S1 Teknik Lingkungan**
4. **S1 Matematika**
5. **S1 Fisika**
6. **S1 Kimia**
7. **S1 Biologi**
8. **S1 Agroteknologi**

Berdasarkan studi empiris dinamika perkuliahan di lingkungan FST Kampus 1 Cipadung dan Kampus 2:

1. **Disparitas Pemahaman Awal Mahasiswa:** Pada mata kuliah fundamental sains dan komputasi (Algoritma Pemrograman, Kalkulus, Fisika Dasar, Rangkaian Listrik, Kimia Dasar), mahasiswa baru kerap mengalami kesulitan beradaptasi dengan ritme perkuliahan dan praktikum laboratorium.
2. **Kebutuhan Responsi & Review Praktikum Lab:** Setiap semester, mahasiswa sains dan teknik wajib menempuh praktikum laboratorium (Lab Komputer FST Lt. 3, Lab Terpadu MIPA FST, Lab Lingkungan & Studio Elektro). Mahasiswa sangat membutuhkan forum belajar kelompok untuk persiapan tes awal (_pre-test_), praktikum, dan ujian responsi laboratorium.
3. **Peminatan Riset & Tugas Akhir Interdisipliner:** Banyak proyek akhir atau Program Kreativitas Mahasiswa (PKM) yang membutuhkan kolaborasi lintas program studi (contoh: Internet of Things Agroteknologi + Teknik Elektro, Bioinformatika Biologi + Teknik Informatika), namun belum ada wadah resmi untuk menemukan rekan belajar lintas jurusan.
4. **Ketiadaan Rekam Jejak Terverifikasi untuk SKPI:** Mahasiswa berprestasi yang aktif membimbing rekan seangkatannya atau adik tingkat (_peer tutor_) tidak memiliki bukti rekam jejak formal yang dapat diajukan ke dekanat untuk poin **Surat Keterangan Pendamping Ijazah (SKPI)** pada kategori keaktifan akademik dan kepemimpinan.
5. **Hambatan Finansial Bimbingan Komersial:** Jasa bimbingan belajar komersial di luar kampus berbiaya mahal dan silabusnya sering tidak sesuai dengan kurikulum RPS (Rencana Pembelajaran Semester) dosen FST UIN SGD Bandung.

---

## 3. Visi & Sasaran Produk (Goals & Metrics)

- **Visi:** Mewujudkan budaya gotong royong akademik (_academic peer-learning culture_) yang inklusif, terstruktur, bermartabat, dan berdaya saing tinggi di Fakultas Sains dan Teknologi UIN Sunan Gunung Djati Bandung.
- **Sasaran Utama:**
  1. **Kurikulum Terintegrasi FST:** Menyediakan direktori kurikulum bawaan 81+ mata kuliah riil FST UIN SGD, dilengkapi kemampuan "Pakai Ketik" (_instant custom-add_) bagi mahasiswa yang menempuh mata kuliah pilihan khusus atau topik riset spesifik.
  2. **Koordinasi Pertemuan Kampus Presisi:** Menyediakan preset titik kumpul resmi di lingkungan kampus (Gedung FST Lt. 3 Lab Komputer, Lab Terpadu MIPA, Perpustakaan Utama Cipadung, Gazebo GKB, Kampus 2 Soekarno-Hatta) yang terhubung dengan GPS dan Google Maps.
  3. **Portofolio SKPI Terverifikasi:** Menerbitkan dokumen digital dan cetak resmi "Surat Keterangan Kontribusi Tutor Sebaya" dengan nomor registrasi unik dan akumulasi poin kontribusi untuk lampiran berkas yudisium/SKPI fakultas.
  4. **Komunikasi Real-Time Terkendali:** Menyediakan ruang diskusi privat (_chat polling_) bagi peserta yang telah disetujui host guna koordinasi materi, tugas, dan link pertemuan daring secara aman.

---

## 4. Persona Pengguna di Lingkungan FST

1. **Mahasiswa Pembelajar (_Learner_):**
   - Mahasiswa FST semester 1–6 yang membutuhkan pendampingan materi sulit (misal: Struktur Data, Kalkulus Integral, Mikrobiologi Lingkungan, Rangkaian Logika).
   - Kebutuhan: Menemukan sesi belajar terdekat, melihat kualifikasi tutor, dan mendaftar dengan sekali klik.
2. **Peer Tutor / Asisten Laboratorium (_Host_):**
   - Mahasiswa tingkat atas atau asisten lab yang telah menguasai mata kuliah tertentu dan ingin berbagi ilmu sekaligus mengumpulkan portofolio SKPI.
   - Kebutuhan: Mengatur kuota peserta, memvalidasi peserta yang serius belajar, membagikan agenda belajar, dan mendapatkan penilaian ulasan bintang.
3. **Dosen Pembina & Admin Akademik:**
   - Meninjau iklim belajar komunitas mahasiswa, memoderasi sesi belajar agar terbebas dari kecurangan akademik (misal: jasa joki tugas yang dilarang keras), dan memvalidasi keabsahan poin kontribusi tutor.

---

## 5. Ruang Lingkup Fungsional (Functional Requirements)

### Modul 1: Identitas Akademik & Profil Mahasiswa FST

- **FR-1.1:** Mahasiswa dapat mendaftar menggunakan email kampus (`@uinsgd.ac.id`) atau email pribadi, dengan pencantuman identitas Program Studi resmi di lingkungan FST.
- **FR-1.2:** Autentikasi aman berbasis stateless JWT (_Json Web Token_) dengan rotasi sesi dan verifikasi data pengguna.
- **FR-1.3:** Manajemen Profil Pengguna mencakup nama lengkap, program studi / institusi, biografi akademik, rekam jejak poin kontribusi, serta lencana verifikasi mahasiswa.
- **FR-1.4:** **Kelola Minat & Keahlian Belajar (FST Curriculum Engine):**
  - Katalog 81+ mata kuliah 8 prodi FST UIN SGD Bandung terbagi dalam tab rumpun ilmu.
  - Pencarian teks langsung (_live search_) dengan _instant autocomplete_.
  - Fitur **"Pakai Ketik" Cepat (1-Click Action Bar)**: Mahasiswa dapat mengetikkan topik/mata kuliah baru dan langsung menandainya sebagai _Dikuasai (Siap Bimbing)_ atau _Ingin Belajar_.
  - Filter status terpisah: _Semua_, _Dikuasai_, dan _Ingin Belajar_.
- **FR-1.5 (Rulebook & Pemulihan Akun OTP):** Registrasi mensyaratkan persetujuan Rulebook Komunitas. Pengguna dapat mereset kata sandi melalui OTP 6 digit yang dikirim via SMTP (berlaku 15 menit, sekali pakai).

### Modul 2: Sesi Belajar Komunitas (_Learning Groups_)

- **FR-2.1:** Host dapat membuka sesi belajar baru dengan memasukkan:
  - Topik / judul kegiatan perkuliahan.
  - Kategori rumpun ilmu (Teknologi, Teknik Elektro, Teknik Lingkungan, Matematika, Fisika, Kimia, Biologi, Agroteknologi, Sains Data, Desain, Bahasa, Soft Skills).
  - Format sesi: **Daring** (link Google Meet/Zoom) atau **Luring** (lokasi fisik kampus).
  - Agenda belajar terstruktur (minimal 1 butir materi bahasan).
  - Prasyarat materi pendukung (_prerequisites_).
  - Tanggal dan jam pelaksanaan (waktu mulai & selesai terverifikasi valid).
  - Kuota maksimal peserta (2 hingga 50 mahasiswa).
- **FR-2.2:** **Integrasi Titik Lokasi Kampus FST UIN SGD Bandung:**
  - Preset titik koordinat GPS 1-klik:
    - _Gedung FST Kampus 1 Cipadung (Lt. 3 Lab Komputer)_: Lat `-6.931754`, Lng `107.717145`.
    - _Perpustakaan Utama Kampus 1 Cipadung_: Lat `-6.932200`, Lng `107.717500`.
    - _Gedung Kuliah Bersama (GKB) Kampus 1_: Lat `-6.931500`, Lng `107.716800`.
    - _Laboratorium Terpadu MIPA FST_: Lat `-6.931850`, Lng `107.717300`.
    - _Kampus 2 UIN SGD (Jl. Soekarno-Hatta)_: Lat `-6.938800`, Lng `107.698000`.
  - Fitur resolver tautan Google Maps (`maps.app.goo.gl` / format koordinat) dengan proteksi SSRF.
  - Tampilan peta interaktif OpenStreetMap pada rincian kegiatan luring.
- **FR-2.3:** **Kurasi Pra-Publikasi & Siklus Status Kegiatan:**
  - Setiap sesi belajar yang baru diajukan oleh mahasiswa otomatis berstatus `pending_approval` dan tidak tampil di katalog publik maupun rekomendasi hingga disetujui oleh Admin.
  - Apabila Admin menolak pengajuan dengan catatan perbaikan (`rejected`), penyelenggara dapat melihat catatan revisi dan memperbarui materi/jadwal/lokasi agar pengajuan kembali masuk ke antrean `pending_approval`.
  - Setelah disetujui Admin (`open`), penyelenggara dapat memperbarui status kegiatan (`open` $\to$ `ongoing` $\to$ `completed` / `cancelled`).
- **FR-2.4 (Filter Multi-Fakultas):** Katalog sesi mendukung penyaringan berbasis faculty_id dari tabel master faculties.

### Modul 3: Keanggotaan, Persetujuan & Chat Koordinasi

- **FR-3.1:** Mahasiswa dapat mengajukan permohonan bergabung (_Join Request_) ke sesi belajar yang kuotanya masih terbuka.
- **FR-3.2:** Host dapat meninjau profil pemohon dan melakukan aksi: **Setujui (_Accept_)** atau **Tolak (_Reject_)**.
- **FR-3.3:** **Ruang Diskusi Privat & Sinkronisasi Live (Live Polling):**
  - Anggota yang berstatus `accepted` dan Host mendapatkan akses ke tab Chat Diskusi.
  - Sistem melakukan _silent background polling_ otomatis setiap 4 detik untuk memperbarui pesan masuk secara real-time tanpa kedip (_flicker-free_).
- **FR-3.4:** Dasbor "Sesi Saya" memisahkan daftar kegiatan yang sedang diikuti sebagai peserta dan kegiatan yang diselenggarakan sebagai host.
- **FR-3.5 (Multi-Tutor / Co-Host):** Primary Host dapat mengundang hingga 3 Co-Tutor via email. Co-Tutor yang menerima undangan memiliki hak mengelola peserta dan jadwal sesi, serta berbagi poin kontribusi, tanpa hak membatalkan sesi.

### Modul 4: Umpan Balik, Reputasi & Penerbitan SKPI

- **FR-4.1:** Peserta memberikan rating bintang (1–5) dan ulasan kualitatif kepada tutor setelah sesi berstatus `completed`.
- **FR-4.2:** Sistem menghitung Poin Kontribusi Tutor berdasarkan kelancaran sesi dan ulasan positif peserta.
- **FR-4.3:** **Generator Sertifikat SKPI Digital & Print-Ready:**
  - Surat Keterangan Kontribusi Tutor Sebaya resmi bertanda tangan digital sistem.
  - Mencantumkan Nomor Registrasi Dokumen unik, data diri mahasiswa, program studi, akumulasi poin tutor, serta daftar mata kuliah kurikulum FST yang dibimbing.
  - Dukungan mode cetak printer (_browser print CSS_) dengan standar tata letak dokumen akademik A4.

### Modul 5: Keamanan, Kurasi Admin & Layanan Mahasiswa

- **FR-5.1:** Mahasiswa dapat melaporkan (_report_) sesi belajar atau pengguna yang melanggar kode etik akademik (misal: plagiarisme, joki ujian komersial, perundungan).
- **FR-5.2:** Moderator dapat meninjau laporan, akun yang dibatasi otomatis (`restricted` pada 3 pelapor unik dalam 7 hari), dan mengambil tindakan pemulihan atau penangguhan akun (`suspended`).
- **FR-5.3:** **Ruang Kendali Admin Terpisah (`AdminLayout` & `AdminDashboardPage`):**
  - Akun dengan peran admin (`admin`, `faculty_admin`, `super_admin`) diarahkan otomatis setelah login ke ruang kerja khusus Admin yang terpisah dari beranda katalog mahasiswa, dilengkapi tombol pratinjau katalog publik bila diperlukan.
  - Peran `faculty_admin` dibatasi ruang lingkupnya hanya pada antrean verifikasi dan peninjauan sesi milik `faculty_id` fakultasnya sendiri, sedangkan `super_admin` memiliki visibilitas dan wewenang penuh lintas fakultas.
  - Mencakup empat menu operasional: Ringkasan Ekosistem, Verifikasi Sesi (inspeksi lengkap agenda, jadwal, koordinat kampus/tautan, serta rekam jejak host untuk ACC atau Tolak dengan catatan), Kotak Masuk Bantuan Mahasiswa, dan Pusat Laporan & Moderasi.
- **FR-5.4:** **Layanan Chat Mahasiswa ke Tim Admin (_Shared Helpdesk Inbox_):**
  - Mahasiswa terotentikasi dapat mengirim pertanyaan atau klarifikasi ke tim admin melalui dialog Bantuan Admin (`StudentSupportModal.jsx`) dengan sinkronisasi otomatis setiap 4 detik.
  - Seluruh pesan masuk terhimpun dalam satu kotak masuk bersama di ruang admin (`support_threads` & `support_messages`), sehingga admin mana pun yang sedang bertugas dapat membalas dengan identitas pengirim admin tercatat jelas pada riwayat percakapan.

---

## 6. Kebutuhan Non-Fungsional (Non-Functional Requirements)

1. **Efisiensi Sumber Daya & Kinerja Eksekusi (Golang Fiber v2):**
   - Backend Go berjalan sebagai _native single binary_ dengan konsumsi memori _idle_ **< 30 MB RAM**.
   - Waktu respon API p95 untuk query katalog dan filter keahlian **< 60 ms**.
2. **Konektivitas Database PostgreSQL (Neon Tech Serverless):**
   - Koneksi _pooled_ (PgBouncer) yang kompatibel dengan latensi wilayah Singapura (`aws-ap-southeast-1`).
   - Seluruh query bersifat parameter terikat (_parameterized queries_) guna mencegah serangan SQL Injection.
3. **Kepatuhan Antarmuka & Aksesibilitas (React + Vite):**
   - Tema visual _Clean Light Mode_ (#F8FAFC / #FFFFFF) dengan kontras tinggi (WCAG AA).
   - Reflow adaptif sempurna dari ponsel berlayar 360px hingga layar monitor ultrawide 1536px+.
   - Dukungan penuh navigasi keyboard (fokus trap dialog modal, escape close, tab wrap).
4. **Anti-Slop Copywriting:**
   - Seluruh salinan teks antarmuka membumi, akademis, dan relevan dengan realitas perkuliahan mahasiswa FST UIN SGD Bandung (bebas dari jargon AI generik).

---

## 7. Entity-Relationship Diagram (ERD) Spesifikasi FST

```mermaid
erDiagram
    USERS ||--o{ USER_SKILLS : has
    SKILLS ||--o{ USER_SKILLS : categorized_in
    USERS ||--o{ LEARNING_GROUPS : hosts
    LEARNING_GROUPS ||--o{ MEMBERSHIPS : manages
    USERS ||--o{ MEMBERSHIPS : joins
    LEARNING_GROUPS ||--o{ GROUP_MESSAGES : contains
    USERS ||--o{ GROUP_MESSAGES : sends
    LEARNING_GROUPS ||--o{ FEEDBACK : evaluates
    USERS ||--o{ FEEDBACK : writes
    USERS ||--o{ REPORTS : submits
    USERS ||--o{ REPORTS : target_user
    USERS ||--o| SUPPORT_THREADS : opens
    SUPPORT_THREADS ||--o{ SUPPORT_MESSAGES : contains
    USERS ||--o{ SUPPORT_MESSAGES : sends

    USERS {
        uuid id PK
        varchar email UK "Akun Mahasiswa / SSO"
        varchar password_hash "Bcrypt cost 10"
        varchar full_name "Nama Lengkap Mahasiswa"
        varchar role "student | public | admin"
        varchar campus_name "UIN SGD Bandung - Prodi FST"
        varchar gender "Jenis Kelamin"
        text bio "Profil Akademik / Semester / Minat"
        text avatar_url "Foto Profil Terkompresi"
        int contribution_points "Poin Akumulasi Tutor SKPI"
        varchar account_status "active | restricted | suspended"
        text restriction_note "Catatan Pembatasan / Moderasi"
        timestamp created_at
        timestamp updated_at
    }

    SKILLS {
        uuid id PK
        varchar name UK "Mata Kuliah / Keahlian FST"
        varchar category "Teknologi | Elektro | Lingkungan | Matematika | Fisika | Kimia | Biologi | Agroteknologi | Sains Data | Desain | Bahasa | Soft Skills"
        timestamp created_at
    }

    USER_SKILLS {
        uuid user_id FK
        uuid skill_id FK
        varchar skill_type "mastered | learning"
    }

    LEARNING_GROUPS {
        uuid id PK
        uuid host_id FK
        varchar title "Topik Pembahasan / Responsi / Ujian"
        text description "Rincian Sasaran & Bahan Ajar"
        varchar category "Rumpun Ilmu Prodi FST"
        varchar format "online | offline"
        varchar location_or_link "Ruang Kelas / Link Daring"
        double_precision latitude "Koordinat GPS Kampus"
        double_precision longitude "Koordinat GPS Kampus"
        varchar building_details "Nama Gedung / Lt. Labkom"
        text_array agenda "Butir Rencana Belajar"
        text prerequisites "Prasyarat Materi"
        timestamp start_time
        timestamp end_time
        int max_capacity "2 sampai 50 peserta"
        varchar status "pending_approval | rejected | open | ongoing | completed | cancelled"
        text review_note "Catatan Kurasi / Alasan Penolakan Admin"
        uuid reviewed_by FK "Admin Peninjau"
        timestamp reviewed_at "Waktu Peninjauan Admin"
        timestamp created_at
        timestamp updated_at
    }

    MEMBERSHIPS {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        varchar status "pending | accepted | rejected | cancelled | attended"
        timestamp created_at
        timestamp updated_at
    }

    GROUP_MESSAGES {
        uuid id PK
        uuid group_id FK
        uuid sender_id FK
        text message "Pesan Koordinasi Sesi Belajar"
        timestamp created_at
    }

    FEEDBACK {
        uuid id PK
        uuid group_id FK
        uuid reviewer_id FK
        int rating "Skala 1 sampai 5"
        text comment "Ulasan Kualitas Tutor"
        timestamp created_at
    }

    REPORTS {
        uuid id PK
        uuid reporter_id FK
        uuid reported_user_id FK
        uuid target_group_id FK
        varchar reason "Kategori Pelanggaran"
        text details "Uraian Bukti"
        varchar status "pending | reviewed | resolved"
        timestamp created_at
    }

    SUPPORT_THREADS {
        uuid id PK
        uuid student_id FK "Unik per mahasiswa"
        varchar subject "Topik Bantuan"
        varchar status "open | resolved"
        timestamp last_message_at
        timestamp created_at
        timestamp updated_at
    }

    SUPPORT_MESSAGES {
        uuid id PK
        uuid thread_id FK
        uuid sender_id FK "Mahasiswa atau Admin Penjawab"
        text message "Isi Pesan Bantuan"
        timestamp created_at
    }
```

---

## 8. Kontrak Endpoint REST API (Go Backend Clean Architecture)

| Method   | Endpoint                                     | Akses               | Fungsi / Logika Bisnis                                                                    |
| :------- | :------------------------------------------- | :------------------ | :---------------------------------------------------------------------------------------- |
| `POST`   | `/api/v1/auth/register`                      | Publik              | Registrasi mahasiswa baru FST                                                             |
| `POST`   | `/api/v1/auth/login`                         | Publik              | Login & penerbitan token JWT stateless                                                    |
| `GET`    | `/api/v1/auth/me`                            | Autentikasi         | Pengambilan profil akun aktif                                                             |
|          |
| `PUT`    | `/api/v1/users/profile`                      | Autentikasi         | Pembaruan nama, prodi kampus, dan bio                                                     |
| `GET`    | `/api/v1/skills`                             | Publik              | Katalog 81+ mata kuliah FST UIN SGD                                                       |
| `POST`   | `/api/v1/users/skills`                       | Autentikasi         | Sinkronisasi batch keahlian (Kuasai/Belajar)                                              |
| `POST`   | `/api/v1/users/skills/custom`                | Autentikasi         | **Pakai Ketik:** Tambah mata kuliah kustom instan                                         |
| `GET`    | `/api/v1/groups`                             | Publik              | Penelusuran sesi belajar (filter prodi, format, pencarian)                                |
| `POST`   | `/api/v1/groups`                             | Mahasiswa           | Pembuatan sesi belajar baru dengan preset kampus FST                                      |
| `GET`    | `/api/v1/groups/recommendations`             | Mahasiswa           | Rekomendasi pintar berdasarkan minat belajar                                              |
| `POST`   | `/api/v1/groups/resolve-map`                 | Mahasiswa           | Deteksi otomatis titik koordinat dari link Google Maps                                    |
| `GET`    | `/api/v1/groups/:id`                         | Publik              | Rincian lengkap sesi & daftar peserta                                                     |
| `PATCH`  | `/api/v1/groups/:id/status`                  | Host                | Pembaruan status kegiatan (_ongoing_, _completed_, _cancelled_)                           |
| `POST`   | `/api/v1/groups/:id/join`                    | Mahasiswa           | Pengajuan permohonan bergabung                                                            |
| `PATCH`  | `/api/v1/memberships/:id/status`             | Host                | Persetujuan (_accept_) atau penolakan (_reject_) peserta                                  |
| `GET`    | `/api/v1/groups/:id/messages`                | Anggota             | Ambil riwayat chat koordinasi privat                                                      |
| `POST`   | `/api/v1/groups/:id/messages`                | Anggota             | Kirim pesan koordinasi baru                                                               |
| `GET`    | `/api/v1/my-sessions`                        | Mahasiswa           | Ambil seluruh sesi diikuti & dikelola                                                     |
| `POST`   | `/api/v1/groups/:id/feedback`                | Peserta             | Kirim rating bintang & ulasan tutor                                                       |
| `POST`   | `/api/v1/reports`                            | Mahasiswa           | Laporkan pelanggaran kode etik akademik                                                   |
| `GET`    | `/api/v1/support/my-thread`                  | Mahasiswa           | Ambil atau inisialisasi percakapan bantuan dengan tim admin                               |
| `POST`   | `/api/v1/support/messages`                   | Mahasiswa           | Kirim pesan bantuan ke kotak masuk bersama admin                                          |
| `GET`    | `/api/v1/admin/groups`                       | Admin               | Ambil seluruh daftar pengajuan & status sesi (termasuk `pending_approval` dan `rejected`) |
| `PATCH`  | `/api/v1/admin/groups/:id/review`            | Admin               | Setujui (`approve`) atau tolak dengan catatan (`reject`) pengajuan sesi                   |
| `GET`    | `/api/v1/admin/moderation/reports`           | Admin               | Ambil daftar laporan pelanggaran beserta detail pelapor dan akun terlapor                 |
| `PATCH`  | `/api/v1/admin/reports/:id`                  | Admin               | Perbarui status laporan moderasi                                                          |
| `PATCH`  | `/api/v1/admin/users/:id/moderation`         | Admin               | Pulihkan akses (`restore`) atau tangguhkan akun (`suspend`)                               |
| `GET`    | `/api/v1/admin/support/threads`              | Admin               | Ambil seluruh antrean percakapan bantuan mahasiswa                                        |
| `GET`    | `/api/v1/admin/support/threads/:id/messages` | Admin               | Ambil riwayat lengkap percakapan bantuan tertentu                                         |
| `POST`   | `/api/v1/admin/support/threads/:id/messages` | Admin               | Kirim balasan dari admin yang bertugas ke mahasiswa                                       |
| `PATCH`  | `/api/v1/admin/support/threads/:id/status`   | Admin               | Tandai percakapan selesai (`resolved`) atau buka kembali (`open`)                         |
| `GET`    | `/api/v1/health`                             | Publik              | Pemeriksaan status konektivitas Go & PostgreSQL                                           |
| `POST`   | `/api/v1/auth/forgot-password`               | Publik              | Menerbitkan & mengirim OTP 6 digit reset kata sandi via SMTP                              |
| `POST`   | `/api/v1/auth/reset-password`                | Publik              | Memverifikasi OTP 6 digit dan memperbarui kata sandi baru                                 |
| `GET`    | `/api/v1/master/faculties`                   | Publik              | Mengambil daftar fakultas, prodi, dan titik lokasi kampus                                 |
| `GET`    | `/api/v1/groups/:id/cohosts`                 | Autentikasi         | Mengambil daftar Co-Tutor pada sebuah sesi belajar                                        |
| `POST`   | `/api/v1/groups/:id/cohosts`                 | Primary Host        | Mengundang rekan mahasiswa sebagai Co-Tutor via email (maks. 3)                           |
| `PATCH`  | `/api/v1/groups/:id/cohosts/respond`         | Co-Tutor            | Menerima (`accepted`) atau menolak (`declined`) undangan Co-Tutor                         |
| `DELETE` | `/api/v1/groups/:id/cohosts/:userId`         | Primary Host / Diri | Menghapus atau keluar dari peran Co-Tutor                                                 |
| `GET`    | `/api/v1/my-cohost-invitations`              | Mahasiswa           | Mengambil daftar undangan & peran Co-Tutor aktif milik pengguna                           |

---

## 9. Rencana Verifikasi Kualitas & Standardisasi Rekayasa

Berdasarkan standar penjaminan mutu rekayasa perangkat lunak:

1. **Pengujian Unit Backend:** Pengujian unit Go (`go test -v ./...`) mencakup otentikasi role, kurasi persetujuan sesi admin terlingkup fakultas, reset kata sandi OTP + SMTP mailer, kolaborasi Co-Tutor, master data fakultas, chat bantuan multi-admin, moderasi akun, resolusi koordinat peta, dan konsistensi data anggota (100% lulus).
2. **Pengujian Unit Frontend:** Pengujian Vitest React (`npm test`) mencakup 19 berkas uji coba (189 tests) dengan validasi form, alur OTP reset kata sandi, Ruang Kendali Admin dan Shared Inbox, modal bantuan mahasiswa, penanganan galat jaringan, serta aksesibilitas dialog modal (100% lulus).
3. **Kompilasi Bersih:** `go vet ./...` bersih tanpa peringatan dan `npm run build` sukses dalam hitungan milidetik.
