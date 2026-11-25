# PeerLearn (UIN SGD Bandung Full Edition)

Platform pembelajaran kolaboratif sebaya (*Peer-Assisted Learning*) tanpa biaya untuk mahasiswa di seluruh 9 Fakultas dan Pascasarjana (48 program studi pada Kampus 1 Cibiru dan Kampus 2 Cimencrang) Universitas Islam Negeri Sunan Gunung Djati Bandung.

- Branch `uin-sgd-full`: Edisi lengkap lintas 9 Fakultas + Pascasarjana dengan fitur Co-Author (`Co-Tutor`), tab Materi Sesi, ekspor kalender `.ics`, antrean otomatis FIFO, Papan Usulan Topik, QR Code SKPI, verifikasi email kampus, dan pemulihan kata sandi.
- Branch `main`: Edisi awal yang difokuskan pada lingkup Fakultas Sains dan Teknologi (FST).

---

## 1. Kegunaan Aplikasi & Alur Pengguna

PeerLearn menghubungkan mahasiswa yang membutuhkan pendampingan materi kuliah (*Learner*) dengan rekan mahasiswa atau asisten praktikum yang siap membimbing (*Peer Tutor*) secara terstruktur, terkurasi oleh admin akademik, dan terdokumentasi ke dalam portofolio SKPI.

### A. Mahasiswa / Peserta (User)
- **Katalog Lintas 20 Rumpun Ilmu:** Pencarian sesi daring maupun luring lengkap dengan filter rumpun keilmuan (Teknologi, Hukum & Syariah, Ekonomi & Bisnis Islam, Pendidikan & Tarbiyah, Psikologi, Ushuluddin, Komunikasi & Dakwah, MIPA, hingga Bahasa & Soft Skills).
- **Rekomendasi Cerdas & Deteksi Bentrok Jadwal:** Penilaian relevansi berbasis kemiripan keahlian, kecocokan fakultas atau program studi (*cold-start*), pemeringkatan reputasi tutor, serta pengecualian sesi yang jadwalnya bertabrakan dengan sesi aktif pengguna.
- **Antrean Otomatis FIFO (*Waitlist*):** Jika kapasitas sesi penuh, peserta dapat masuk daftar tunggu. Saat ada kursi kosong karena pembatalan atau penyesuaian peserta, sistem otomatis mempromosikan pengantre paling awal beserta notifikasi ke mahasiswa terkait dan penyelenggara.
- **Papan Usulan Topik (*Study Request Board*):** Mahasiswa dapat mengusulkan topik atau mata kuliah yang dibutuhkan, memberi dukungan suara (*upvote*), dan mendorong penyelenggara membuka sesi resmi langsung dari usulan tersebut.
- **Ekspor Kalender `.ics` & Google Calendar:** Peserta terkonfirmasi dapat mengunduh jadwal sesi berformat RFC 5545 (`.ics`) atau membuka pintasan Google Calendar dengan sanitasi tautan rapat privat untuk non-anggota.
- **Ruang Diskusi Privat:** Percakapan internal antar-anggota terverifikasi dengan pembaruan latar belakang otomatis setiap 4 detik, balasan pesan (*reply*), reaksi emoji, dan sematan (*pin*) pengumuman penting.
- **Verifikasi Email Kampus & Keamanan Akun:** Pengajuan lencana verifikasi untuk domain `@uinsgd.ac.id` dan `@student.uinsgd.ac.id`, serta alur lupa/atur ulang kata sandi berbasis token.
- **Notifikasi & Bantuan Admin:** Lonceng notifikasi *in-app* untuk status keanggotaan, promosi antrean, pin chat, dan balasan layanan bantuan (*Student Support*).

### B. Penyelenggara Sesi (Host Utama & Co-Author / Co-Tutor)
- **Pembuatan Sesi Daring/Luring & 8 Preset Kampus:** Mendukung 8 titik temu kampus UIN SGD (Gedung FST & Lab Komputer Cibiru, Lab Terpadu MIPA, Perpustakaan Rachmat Djatnika, GKB Kampus 1, Student Center & Masjid Iqomah, Gedung Fakultas Kampus 1, Gedung Perkuliahan Kampus 2 Cimencrang, dan Student Center Kampus 2) serta smart resolver tautan Google Maps berproteksi anti-SSRF.
- **Kolaborasi Multi-Author (`Co-Tutor`):** Host utama dapat menambahkan hingga 5 akun terdaftar sebagai Co-Author. Co-Author berhak menerima/menolak pendaftar, mencatat kehadiran (`attended`), mengelola tab `Materi Sesi`, menyematkan pesan diskusi, menjadwalkan ulang sesi, dan menerima catatan kontribusi `co_tutor` di SKPI, sedangkan penambahan/penghapusan Co-Author maupun pembatalan sesi tetap khusus bagi Host utama.
- **Tab `Materi Sesi`:** Penyelenggara dan Co-Author dapat membagikan tautan materi, salindia, repositori kode, atau latihan soal dengan kontrol akses khusus anggota sesi.
- **Jadwal Berkelanjutan (`+7 Hari`):** Penyelenggara dapat memajukan jadwal ke pekan berikutnya tanpa mengulang pendaftaran peserta yang sudah diterima.
- **Sertifikat SKPI Resmi & QR Code Verifikasi:** Generator Surat Keterangan Kontribusi Tutor Sebaya siap cetak ukuran A4 yang memuat poin kontribusi, peran tutor/co-tutor, riwayat sesi terverifikasi, QR Code SVG native, serta tautan verifikasi publik `/verifikasi-skpi/:id`.

### C. Admin Akademik (`AdminDashboardPage`)
- **Kurasi Sesi (`pending_approval` -> `open` / `rejected`):** Setiap sesi baru ditinjau terlebih dahulu oleh admin sebelum tampil di katalog publik, lengkap dengan catatan persetujuan atau revisi.
- **Kotak Masuk Bantuan Bersama (*Shared Helpdesk Inbox*):** Seluruh admin dapat membalas pertanyaan dan kendala mahasiswa dari satu antrean terpadu dengan identitas penanggap tercatat jelas.
- **Pusat Laporan & Moderasi:** Penanganan laporan pelanggaran pengguna, pembatasan akses akun bermasalah (`restricted`), dan pemulihan akun, disertai mode pratinjau katalog mahasiswa.

---

## 2. Arsitektur Sistem & Tech Stack

Backend menerapkan **Clean Architecture** dengan injeksi dependensi antar-lapisan (`Handler -> Service -> Repository -> PostgreSQL`), sedangkan frontend menggunakan **Component-Driven React SPA** dengan modal `<dialog>` natif dan manajemen state sesi JWT.

```mermaid
graph TD
    Client["React 19.3 + Vite 8 + Tailwind CSS 4"]
    APIClient["Axios REST Client"]
    Router["Go 1.26 + Fiber v2.52 (JWT, CORS, Logger)"]
    Handler["HTTP Transport Handlers"]
    Service["Domain Services (Business Rules & Validation)"]
    Repo["PostgreSQL Repositories (pgx v5.11)"]
    Mailer["Mailer Service (SMTP / DevLog Fallback)"]
    DB[("PostgreSQL on Neon Serverless")]

    Client --> APIClient
    APIClient -->|JSON REST API| Router
    Router --> Handler
    Handler --> Service
    Service --> Repo
    Service --> Mailer
    Repo -->|Pooled SQL| DB
```

### Rincian Tech Stack

| Lapisan | Teknologi & Versi (sesuai Repositori) | Fungsi Utama |
| :--- | :--- | :--- |
| **Backend Runtime** | Go `1.26.3` (`peerlearn/backend`) | Kompilasi biner tunggal, konkurensi aman, dan *type safety* |
| **HTTP Framework** | Fiber `v2.52.16` | Routing REST API (`111` handler aktif), middleware JWT, CORS, dan logger |
| **Database & Driver** | PostgreSQL (Neon Tech Serverless), `pgx/v5 v5.11.0` | Kueri SQL terparametrisasi, koneksi *pooled* PgBouncer, migrasi otomatis (`000001` sampai `000012`) |
| **Keamanan & Auth** | `golang-jwt/jwt/v5 v5.3.1`, `golang.org/x/crypto v0.58.0` | Autentikasi stateless JWT, hashing sandi Bcrypt, token verifikasi & reset ter-hash |
| **Utilitas Backend** | `google/uuid v1.6.0`, `joho/godotenv v1.5.1`, `net/smtp` | UUID entitas, pemuatan variabel `.env`, pengiriman email opsional |
| **Frontend Core** | React `19.3.1`, React DOM `19.3.1`, Vite `8.3.5` | Antarmuka SPA cepat dengan *lazy loading* modal berat |
| **Styling & Ikon** | Tailwind CSS `4.3.3` (`@tailwindcss/vite`), `lucide-react v1.65.0` | Utilitas tata letak responsif (mobile `360px` hingga desktop) dan cetak A4 |
| **HTTP & Utilitas UI** | Axios `1.21.0`, `qrcode v1.5.4` | Interseptor autentikasi JWT, pembuat QR Code SVG native untuk cetak SKPI |
| **Kualitas & Uji** | `go test`, Vitest `5.0.5`, Testing Library React `16.3.3`, JSDOM `29.1.1`, Oxlint `1.89.0` | Pengujian unit/integrasi backend & frontend serta linting statis |

---

## 3. Struktur Direktori Proyek

```text
sosio/
├── backend/
│   ├── cmd/api/main.go                         # Inisialisasi koneksi DB, DI container, & routing API
│   ├── internal/
│   │   ├── config/config.go                    # Pemuatan env (.env / .env.local), CORS, & SMTP
│   │   ├── database/
│   │   │   ├── postgres.go                     # Koneksi pgxpool & eksekutor migrasi otomatis
│   │   │   └── migrations/                     # 12 berkas migrasi SQL berurutan (000001 - 000012)
│   │   ├── domain/                             # Struct entitas, DTO request/response, interface repo
│   │   ├── handler/                            # Controller HTTP per domain (auth, group, membership, message, study_request, admin, dll.)
│   │   ├── mailer/                             # Antarmuka Mailer (SMTPMailer & DevLogMailer)
│   │   ├── middleware/                         # JWT auth guard, role guard admin, panic recovery
│   │   ├── repository/                         # Implementasi kueri SQL PostgreSQL
│   │   ├── security/                           # Pembuatan/validasi JWT, hashing Bcrypt, token hash
│   │   └── service/                            # Aturan bisnis (kuota, waitlist FIFO, Co-Author, SKPI, rekomendasi, SSRF guard)
│   ├── .env.example
│   ├── go.mod
│   └── go.sum
│
├── frontend/
│   ├── src/
│   │   ├── api/                                # Klien Axios & kontrak endpoint REST API
│   │   ├── components/
│   │   │   ├── admin/                          # AdminApprovalsPanel, AdminSupportInbox, AdminModerationPanel
│   │   │   ├── auth/                           # AuthModal (Masuk, Daftar 48 prodi UIN SGD, Lupa & Reset Sandi)
│   │   │   ├── common/                         # Navbar, Footer, InfoGuideModal, LinkifiedText
│   │   │   ├── feedback/                       # FeedbackModal (rating & ulasan pasca-sesi)
│   │   │   ├── groups/                         # CreateGroupModal, GroupCard, GroupDetailModal (Tab Info, Materi, Diskusi)
│   │   │   ├── notifications/                  # NotificationBell (popover notifikasi & tanda sudah dibaca)
│   │   │   ├── profile/                        # ProfileModal, PublicProfileModal, SkillsModal, TutorSummaryModal, SKPIQrCode
│   │   │   ├── reports/                        # ReportModal (pelaporan sesi/pengguna)
│   │   │   ├── requests/                       # StudyRequestBoard, CreateStudyRequestModal
│   │   │   ├── sessions/                       # MySessionsModal (Sesi Diikuti, Diselenggarakan, & Co-Tutor)
│   │   │   ├── support/                        # StudentSupportModal (tiket bantuan mahasiswa)
│   │   │   └── ui/                             # Komponen dasar (Button, Badge, Input, Modal, UserAvatar, LoadError)
│   │   ├── context/                            # AuthContext.jsx & useAuth.js
│   │   ├── data/campusData.js                  # 9 Fakultas + Pascasarjana, 48 prodi, 20 rumpun ilmu, 8 preset kampus
│   │   ├── hooks/                              # Custom hooks validasi form
│   │   ├── layouts/                            # MainLayout & AdminLayout
│   │   ├── pages/                              # HomePage, AdminDashboardPage, SKPIVerifyPage
│   │   └── utils/                              # calendarIcs.js (.ics & link kalender), imageCompressor.js, sessionRoute.js
│   ├── package.json
│   └── vite.config.js
│
├── docs/SRS.md                                 # Spesifikasi kebutuhan perangkat lunak (IEEE 830)
├── PRD.md                                      # Product Requirements Document
├── DESIGN.md                                   # Panduan desain visual & komponen UI
├── AGENTS.md                                   # Aturan standar arsitektur, pengujian, dan penulisan kode
└── README.md
```

---

## 4. Menjalankan Aplikasi Secara Lokal

### Prasyarat
- **Go:** versi `1.22` atau lebih baru (`go.mod` memakai Go `1.26.3`).
- **Node.js & npm:** disarankan Node.js `20 LTS` atau lebih baru.
- **PostgreSQL:** basis data Neon Tech Serverless (atau PostgreSQL lokal `>= 15`).

### 1. Kloning & Siapkan Konfigurasi Backend

```powershell
git clone https://github.com/rakaalpiansyah/PeerLearn.git
cd PeerLearn
git checkout uin-sgd-full

cd backend
Copy-Item .env.example .env
```

Lengkapi `backend/.env` dengan kredensial basis data Anda:

```env
PORT=8080
DATABASE_URL=postgresql://user:password@ep-example-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=ganti_dengan_secret_acak_yang_kuat
APP_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
APP_BASE_URL=http://localhost:5173

# Konfigurasi SMTP opsional (jika kosong dan APP_ENV=development, memakai DevLogMailer fallback)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### 2. Jalankan Server Backend (Port `8080`)

Seluruh 12 file migrasi SQL beserta katalog mata kuliah dan data demo dijalankan otomatis saat server aktif:

```powershell
cd backend
go run ./cmd/api
```

### 3. Jalankan Server Frontend (Port `5173`)

Buka terminal kedua:

```powershell
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173/` pada browser Anda.

### Akun Uji Bawaan (*Database Seed*)

Seluruh akun bawaan menggunakan kata sandi `password123`:

| Peran | Email | Identitas | Keterangan Penggunaan |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin.fst@uinsgd.ac.id` | Admin Akademik UIN SGD | Akses `AdminDashboardPage` (ACC sesi, shared inbox bantuan, moderasi) |
| **Admin** | `wakildekan3.fst@uinsgd.ac.id` | Koordinator Kemahasiswaan | Akun admin kedua untuk simulasi balasan *multi-admin* |
| **Host / Mahasiswa** | `nabila.azzahra@uinsgd.ac.id` | Nabila Azzahra (Teknik Informatika) | Pemilik sesi aktif, pengelolaan Co-Author, materi, & SKPI ber-QR |
| **Mahasiswa / Co-Tutor** | `fajar.ramadhan@uinsgd.ac.id` | Fajar Ramadhan (Teknik Elektro) | Pengujian pengajuan gabung, hak akses Co-Author, & Usulan Topik |
| **Mahasiswa (Moderasi)** | `angga.saputra@uinsgd.ac.id` | Angga Saputra (Agroteknologi) | Akun berstatus `restricted` untuk simulasi pemulihan oleh admin |

---

## 5. Pengujian & Verifikasi Mutu

### Backend (Go)
```powershell
cd backend
go vet ./...
go build ./...
go test -count=1 ./...
```

### Frontend (Vitest, Oxlint, Vite Build)
```powershell
cd frontend
npm test -- --run
npm run lint
npm run build
```

Pada kondisi rilis cabang `uin-sgd-full` (`40a9020`), seluruh suite pengujian backend Go (`middleware`, `security`, `service`) dan `27` berkas uji frontend (`221` pengujian Vitest) lulus tanpa galat, dengan hasil `npm run lint` bersih (`0 warnings and 0 errors` pada `73` berkas).

---

## 6. Indeks Dokumentasi Lainnya

- [PRD.md](./PRD.md) : Visi produk, modul fungsional, ERD, dan kontrak endpoint API.
- [docs/SRS.md](./docs/SRS.md) : Software Requirements Specification (IEEE Std 830) dan kamus data.
- [DESIGN.md](./DESIGN.md) : Standar desain antarmuka, palet warna, tipografi, dan hierarki komponen.
- [AGENTS.md](./AGENTS.md) : Aturan arsitektur Go Clean Architecture, React SPA, dan disiplin verifikasi.

Dikembangkan untuk keperluan kolaborasi akademik non-komersial mahasiswa UIN Sunan Gunung Djati Bandung.
