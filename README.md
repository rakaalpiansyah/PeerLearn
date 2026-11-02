# PeerLearn (FST UIN SGD Bandung Edition)

> **Platform Pembelajaran Kolaboratif Sebaya (*Peer-Assisted Learning*) Bebas Biaya untuk Civitas Akademika Fakultas Sains dan Teknologi, Universitas Islam Negeri Sunan Gunung Djati Bandung.**

[![Go Report Card](https://goreportcard.com/badge/github.com/peerlearn/backend)](https://golang.org)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Go](https://img.shields.io/badge/Backend-Go%201.24%20(Fiber%20v2)-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20(Neon%20Serverless)-336791?logo=postgresql&logoColor=white)](https://neon.tech)
[![Tests](https://img.shields.io/badge/Vitest-176%2F176%20Passed%20(100%25)-success)](https://vitest.dev)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture-blueviolet)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## Indeks Dokumentasi Resmi Proyek

Untuk mempermudah peninjauan teknis, akademik, dan arsitektural sistem, dokumentasi proyek dipisahkan secara terstruktur:

| Berkas Dokumentasi | Standar & Spesifikasi | Deskripsi & Cakupan |
| :--- | :--- | :--- |
| 📘 **[PRD.md](./PRD.md)** | Product Requirements Document v2.0 | Visi produk, latar belakang akademik FST, persona mahasiswa, modul fungsional FR-1 s/d FR-5, Entity-Relationship Diagram (ERD), dan kontrak endpoint REST API. |
| 📑 **[docs/SRS.md](./docs/SRS.md)** | Software Requirements Specification (IEEE Std 830) | Spesifikasi formal rekayasa, use-case rinci SRS-FR-01 s/d 11 (prakondisi, alur normal, eksepsi, pascakondisi), kebutuhan non-fungsional, kamus data PostgreSQL, dan Traceability Matrix. |

---

## 1. Latar Belakang & Urgensi Produk

Fakultas Sains dan Teknologi (FST) UIN Sunan Gunung Djati Bandung menaungi 8 Program Studi Sarjana (S1):
1. **Teknik Informatika**
2. **Teknik Elektro**
3. **Teknik Lingkungan**
4. **Matematika**
5. **Fisika**
6. **Kimia**
7. **Biologi**
8. **Agroteknologi**

Dalam ekosistem akademik sains dan teknologi, mahasiswa menghadapi tantangan perkuliahan yang khas:
* **Disparitas Pemahaman Awal:** Mata kuliah dasar komputasi dan sains fundamental (Algoritma & Pemrograman, Struktur Data, Kalkulus Integral, Fisika Dasar, Rangkaian Listrik) sering menjadi hambatan besar bagi mahasiswa baru.
* **Kebutuhan Responsi Praktikum Laboratorium:** Mahasiswa wajib menjalani praktikum di **Laboratorium Komputer FST (Lt. 3 Gedung FST)** dan **Laboratorium Terpadu MIPA FST**. Sebelum tes awal (*pre-test*) atau responsi akhir praktikum, mahasiswa sangat membutuhkan kelompok belajar intensif untuk mereviu materi bersama asisten lab atau mahasiswa pembimbing (*peer tutor*).
* **Belajar Berkelanjutan (*Continuous Cohort*):** Kelompok belajar akademik tidak selesai dalam satu kali pertemuan. Mahasiswa membutuhkan sistem yang memungkinkan sesi berlanjut setiap pekan (+7 hari) tanpa harus membuat grup baru atau mengulang proses pendaftaran peserta.
* **Pengakuan Formal untuk SKPI:** Mahasiswa yang mendedikasikan waktunya menjadi tutor sebaya membutuhkan bukti rekam jejak resmi yang dapat dicetak dan divalidasi untuk perolehan poin **Surat Keterangan Pendamping Ijazah (SKPI)** pada borang kelulusan yudisium fakultas.

**PeerLearn** hadir sebagai solusi rekayasa perangkat lunak tanpa biaya (*zero-fee*) yang menghubungkan pencari rekan belajar (*Learner*) dengan mahasiswa pembimbing (*Peer Tutor*) secara aman, terstruktur, dan terintegrasi dengan lingkungan fisik kampus FST UIN SGD Bandung.

---

## 2. Arsitektur Perangkat Lunak & Teknologi

PeerLearn menerapkan pemisahan tanggung jawab yang ketat (*Separation of Concerns*) berbasis **Clean Architecture** di sisi backend dan **Component-Driven Architecture** di sisi frontend:

```mermaid
graph TD
    Client["React 18 SPA (Vite + Tailwind CSS)"]
    APIClient["Axios REST Client & Error Interceptor"]
    Router["Fiber v2 HTTP Router & Middleware (JWT, CORS, Logger)"]
    Handler["Transport Layer: HTTP Handlers"]
    Service["Domain Service Layer: Business Logic & Rules"]
    Repo["Data Access Layer: PostgreSQL Repository"]
    DB[("PostgreSQL on Neon Tech Serverless")]

    Client --> APIClient
    APIClient -->|JSON REST over HTTPS| Router
    Router --> Handler
    Handler -->|Dependency Injection| Service
    Service -->|Interfaces| Repo
    Repo -->|PgBouncer Pooled Connection| DB
```

### Rincian Teknologi (*Tech Stack*):
* **Backend:** Golang 1.24, Fiber v2, Stateless JWT (`golang-jwt`), Bcrypt Password Hashing, PGX v5 Driver.
* **Basis Data:** PostgreSQL 16 di Neon Tech Serverless dengan PgBouncer Connection Pooling (wilayah Singapura `aws-ap-southeast-1`).
* **Frontend:** React 18, Vite 8, Tailwind CSS, Lucide React Icons, Native Dialog Modal Accessibility (`<dialog>`).
* **Pengujian Mutu:** Go Native Unit Testing (`go test`), Vitest (`@testing-library/react`), JSDOM Environment.

---

## 3. Fitur Unggulan End-to-End

### A. Mesin Kurikulum FST & Fitur "Pakai Ketik" Instan
* **Katalog Bawaan 81+ Mata Kuliah:** Mencakup seluruh mata kuliah wajib 8 prodi FST UIN SGD Bandung (Algoritma, PBO, Basis Data, Rangkaian Listrik, Kimia Lingkungan, Kalkulus, Biologi Molekuler, dsb.).
* **Bilah Aksi Cepat (*1-Click Quick Add*):** Mahasiswa dapat mengetikkan topik khusus (misal: *Responsi IoT Pak Eki*, *Analisis Spektroskopi FTIR*, *Koding Flutter UTS*). Bilah aksi seketika muncul untuk menambahkan materi tersebut sebagai **Dikuasai (Siap Tutor)** atau **Ingin Dipelajari** dengan satu klik tanpa formulir berbelit.

### B. Preset Lokasi Kampus FST & Integrasi Google Maps
* **1-Click Campus Chips:** Pilihan instan titik temu luring di lingkungan kampus:
  * `🏛️ FST UIN SGD`: Kampus 1 Cipadung (Gedung FST Lt. 3 Lab Komputer).
  * `🔬 Lab MIPA FST`: Laboratorium Terpadu MIPA FST (Fisika, Kimia, Biologi).
  * `📚 Perpus UIN SGD`: Perpustakaan Utama Kampus 1 Cipadung.
  * `🏢 GKB UIN SGD`: Gedung Kuliah Bersama Kampus 1 Cipadung.
  * `📍 Kampus 2 Soetta`: Kampus 2 UIN SGD (Jl. Soekarno-Hatta).
* **Smart Resolver Google Maps:** Pengguna dapat menempelkan tautan `maps.app.goo.gl` atau koordinat GPS mentah; backend secara otomatis membedah dan memetakan titik koordinatnya dengan proteksi SSRF.

### C. Alur Sesi Berkelanjutan (*Cohort Scheduling +7 Hari*)
* **Reschedule Pintar:** Host dapat memajukan jadwal ke pekan depan menggunakan tombol pintas **`+7 Hari`**.
* **Keanggotaan Terjaga (*Retained Members*):** Seluruh peserta yang telah diterima otomatis tetap terdaftar di pertemuan berikutnya tanpa harus mendaftar ulang.
* **Pembaruan Tempat & Materi:** Host dapat mengganti lokasi (misal dari Labkom ke Google Meet) dan memasukkan topik bahasan pekan depan yang otomatis terhubung ke agenda silabus.

### D. Alur Pembatalan Transparan Dua Arah
* **Batal Ikut oleh Peserta (*Leave / Cancel Participation*):** Peserta yang berhalangan hadir dapat membatalkan keikutsertaannya kapan saja melalui tombol **"Batal Ikut Sesi"** atau **"Tarik Permohonan"**. Kuota peserta otomatis langsung terlepas dan berkurang 1 secara *real-time*.
* **Pembatalan oleh Host (*Cancel Session*):** Jika Host berhalangan total, sesi dapat diubah ke status `cancelled`. Banner merah peringatan langsung terpampang di seluruh akun peserta dan tombol pendaftaran dinonaktifkan.

### E. Ruang Diskusi Koordinasi (*Live Auto-Polling 4s*)
* Ruang obrolan privat antar-anggota terkonfirmasi dengan pembaruan otomatis setiap 4 detik (*silent background polling*) tanpa kedip layar.
* Koordinasi persiapan praktikum, pembagian tautan Google Drive modul, dan diskusi kendala koding berlangsung terpusat.

### F. Generator Dokumen Portofolio SKPI Resmi
* Menerbitkan **Surat Keterangan Kontribusi Tutor Sebaya** dengan KOP resmi **Fakultas Sains & Teknologi • UIN Sunan Gunung Djati Bandung**.
* Dilengkapi Nomor Registrasi Surat unik, kode *hash* validasi sistem, akumulasi poin kontribusi, daftar mata kuliah yang dibimbing, dan tata letak *print-ready* ramah kertas A4.

---

## 4. Struktur Direktori Proyek

```text
peerlearn/
├── backend/                              # Layanan Backend Golang (Clean Architecture)
│   ├── cmd/
│   │   └── api/
│   │       └── main.go                   # Dependency Injection & Bootstrapping Server
│   ├── internal/
│   │   ├── config/                       # Variabel Lingkungan & Database Config
│   │   ├── database/                     # Koneksi PgBouncer & SQL Migrations
│   │   │   └── migrations/
│   │   │       ├── 000001_init_schema.sql
│   │   │       ├── 000002_campus_features_expansion.sql
│   │   │       └── 000003_fst_uinsgd_academic_skills.sql
│   │   ├── domain/                       # Entity Structs, Interfaces, & DTOs
│   │   ├── handler/                      # HTTP Transport Controller (Fiber v2)
│   │   ├── middleware/                   # JWT Auth, CORS, & Role Guard
│   │   ├── repository/                   # Data Access Layer (SQL Queries on Neon)
│   │   ├── security/                     # Token Signer & Bcrypt Hashing
│   │   └── service/                      # Business Logic & Domain Validation Rules
│   ├── go.mod
│   └── go.sum
│
├── frontend/                             # Aplikasi Web React (Vite SPA)
│   ├── src/
│   │   ├── api/                          # Axios Client, Interceptors, & Endpoints
│   │   ├── components/
│   │   │   ├── auth/                     # AuthModal (Registrasi Prodi FST & Login)
│   │   │   ├── common/                   # Navbar & Footer Bersih
│   │   │   ├── groups/                   # CreateGroupModal, GroupCard, GroupDetailModal
│   │   │   ├── profile/                  # ProfileModal, SkillsModal, TutorSummaryModal (SKPI)
│   │   │   ├── sessions/                 # MySessionsModal (Riwayat Sesi Saya)
│   │   │   └── ui/                       # Primitives (Button, Badge, Modal, Input)
│   │   ├── context/                      # AuthContext (Stateless JWT Session Manager)
│   │   ├── layouts/                      # MainLayout (Container Responsif 1536px)
│   │   ├── pages/                        # HomePage (Katalog Sesi & Filter 8 Prodi)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                     # Tailwind Utility & Print Styles
│   ├── package.json
│   ├── vite.config.js
│   └── vitest.config.js
│
├── docs/                                 # Dokumentasi Spesifikasi & Panduan
│   └── SRS.md                            # Software Requirements Specification Formal (IEEE 830)
├── PRD.md                                # Product Requirements Document v2.0
└── README.md                             # Berkas Panduan Utama Repositori
```

---

## 5. Panduan Instalasi & Menjalankan Lokal (*Getting Started*)

### Prasyarat Sistem:
* **Golang:** Versi $\ge$ 1.22 (Direkomendasikan Go 1.24)
* **Node.js:** Versi $\ge$ 18.x (Direkomendasikan Node.js 20 LTS) & npm
* **PostgreSQL:** Akun Neon Tech PostgreSQL Serverless (atau PostgreSQL lokal)

### Langkah 1: Kloning & Persiapan Berkas Konfigurasi

```powershell
# Kloning repositori
git clone https://github.com/your-org/peerlearn.git
cd peerlearn

# Salin contoh environment di backend
cd backend
Copy-Item .env.example .env  # Atur DATABASE_URL dan JWT_SECRET
```

Isi berkas `backend/.env`:
```env
PORT=8080
DATABASE_URL=postgres://username:password@ep-sample-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=rahasia_jwt_peerlearn_fst_uinsgd_2026
APP_ENV=development
```

### Langkah 2: Menjalankan Backend Go

Migrasi database (tabel skema, indeks, dan 81 mata kuliah FST UIN SGD) akan dieksekusi secara otomatis saat backend pertama kali dinyalakan:

```powershell
cd backend
go run cmd/api/main.go
```
*Server Go Fiber akan aktif di `http://localhost:8080`*.

### Langkah 3: Menjalankan Frontend React

Buka terminal baru:

```powershell
cd frontend
npm install
npm run dev
```
*Aplikasi frontend Vite akan aktif di `http://localhost:5173`*.

---

## 6. Protokol Verifikasi & Pengujian Mutu (*Quality Evidence*)

Setiap perubahan kode di repositori ini diverifikasi menggunakan protokol ketat:

### Pengujian Frontend (Vitest):
```powershell
cd frontend
npm test
```
*Hasil:* **15 berkas uji coba, 176 pengujian unit lulus 100%** (durasi ~13–14 detik).

### Kompilasi Produksi Frontend:
```powershell
cd frontend
npm run build
```
*Hasil:* Terkompilasi bersih tanpa peringatan (*clean bundle*) dalam **< 500ms**.

### Pengujian Backend (Go Tests & Go Vet):
```powershell
cd backend
go test -v ./...
go vet ./...
```
*Hasil:* **Seluruh paket pengujian lulus 100%**, `go vet` bersih dari kesalahan alokasi memori atau konkurensi.

---

## 7. Lisensi & Tim Pengembang

Proyek ini dikembangkan oleh **Kelompok 5 (Mata Kuliah Sosiologi Komputasi / Proyek Rekayasa Perangkat Lunak Mahasiswa)** untuk civitas akademika **Fakultas Sains dan Teknologi, UIN Sunan Gunung Djati Bandung**.

Lisensi: [MIT License](LICENSE) — Bebas digunakan dan dikembangkan untuk kepentingan edukasi kampus.
