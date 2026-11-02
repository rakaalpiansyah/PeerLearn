# Moderasi Bertahap, Profil Publik (Foto & Gender), dan Restrukturisasi UI Mobile/Desktop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun sistem moderasi dua tahap (*auto-restrict* $\ge 3$ pelapor unik dalam 7 hari + eksekusi Admin *Restore/Suspend*), fitur klik lihat profil publik pengguna lain beserta unggah foto profil terkompresi dari perangkat & gender, serta merombak tata letak mobile/desktop & tautan Footer agar ringkas, ergonomis, dan bebas dari *AI-slop*.

**Architecture:** Menggunakan arsitektur SPA React 18 terpadu dengan modal `<dialog>` aksesibel, kompresi gambar berbasis HTML5 `<canvas>` (`256x256` WebP/JPEG `< 30 KB`) yang disimpan di kolom `TEXT` PostgreSQL Neon, serta aturan domain *Clean Architecture* pada backend Go Fiber v2.

**Tech Stack:** Go 1.24 (Fiber v2, PGX v5), PostgreSQL 16 (Neon Serverless), React 18 (Vite, Tailwind CSS), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-02-community-moderation-profile-mobile-design.md`

## Global Constraints

- Semua 176 pengujian unit frontend (`npm test`) dan seluruh paket pengujian backend (`go test -v ./...`) wajib tetap lulus 100% tanpa regresi.
- `MainLayout.test.jsx` menguji `navigation[name="Navigasi akun"]` dan `navigation[name="Navigasi seluler"]` dengan urutan fokus `Tab` dari `Sesi Saya` ke `Buka Sesi` — atribut `aria-label` dan urutan tombol tersebut wajib dipertahankan saat memindahkan navigasi seluler menjadi *Fixed Bottom Bar*.
- Maksimal panjang string `avatar_url` (Data URL terkompresi) yang diterima backend adalah `65536` byte (64 KB).
- Ambang batas pembatasan otomatis (*auto-restrict*) adalah **3 pelapor unik (`COUNT(DISTINCT reporter_id)`) dalam 7 hari terakhir** terhadap pengguna yang sama.
- Bebas dari komentar kode basi (*no AI filler comments*) dan salinan teks pemasaran klise.

## Review Focus

1. **Spam Laporan oleh Pelapor yang Sama:** Satu pengguna yang mengirim 5 laporan berturut-turut terhadap orang/sesi yang sama tidak boleh memicu *auto-restrict*; perhitungan wajib menggunakan `COUNT(DISTINCT reporter_id)` dan menolak laporan duplikat yang masih `pending`.
2. **Laporan Menyasar Grup Tanpa `reported_user_id` Eksplisit:** Saat pengguna melaporkan sesi dari `ReportModal` (yang mengirim `target_group_id`), `EngagementService.CreateReport` wajib mengambil `group.HostID` sebagai `reported_user_id` agar akumulasi laporan penyelenggara tercatat.
3. **Penolakan Aksi bagi Akun `restricted` / `suspended`:** Pengguna yang sedang dibatasi sementara atau ditangguhkan harus ditolak saat memanggil `CreateGroup` dan `JoinGroup` dengan pesan error yang jelas.
4. **Ukuran File Gambar Berlebihan di Klien:** Jika pengguna memilih foto berukuran besar (misal 5 MB) di perangkat, `compressAvatarImage` wajib memperkecil dimensinya ke `256x256` dan menghasilkan Data URL di bawah 64 KB.
5. **Tautan Footer Interaktif & Keyboard Accessible:** Keempat tautan di `Footer.jsx` harus berupa elemen `<button type="button">` asli yang membuka dialog panduan atau SKPI dan dapat dioperasikan via keyboard.

---

### Task 1: Migrasi Database `000004` & Entitas Domain Baru

**Files:**
- Create: `backend/internal/database/migrations/000004_moderation_and_user_profile.sql`
- Modify: `backend/internal/domain/entity.go`
- Modify: `backend/internal/domain/dto.go`
- Modify: `backend/internal/domain/group_dto.go`

**Interfaces:**
- Produces:
  - `domain.AccountStatus` (`AccountActive = "active"`, `AccountRestricted = "restricted"`, `AccountSuspended = "suspended"`)
  - `domain.User` fields: `Gender string`, `AccountStatus AccountStatus`, `RestrictionNote string`
  - `domain.PublicProfileResponse` (`ID`, `FullName`, `Role`, `CampusName`, `Gender`, `Bio`, `AvatarURL`, `ContributionPoints`, `AccountStatus`, `HostedGroupsCount int`, `Skills []UserSkill`, `CreatedAt`)
  - `domain.ModerationReportItem` & `domain.ModerateUserRequest` (`Action string` `"restore" | "suspend"`, `Note string`)

- [ ] **Step 1: Buat berkas migrasi `000004_moderation_and_user_profile.sql`**

```sql
ALTER TABLE users
  ALTER COLUMN avatar_url TYPE TEXT,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS restriction_note TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_reports_reported_user_created
  ON reports(reported_user_id, created_at DESC);

UPDATE users
SET campus_name = 'UIN SGD Bandung - S1 Teknik Informatika'
WHERE campus_name ILIKE '%Universitas Indonesia%';

UPDATE learning_groups
SET location_or_link = 'Gedung FST Kampus 1 Cipadung (Lt. 3 Lab Komputer)'
WHERE location_or_link ILIKE '%Fakultas Ilmu Komputer UI%';

INSERT INTO users (email, password_hash, full_name, role, campus_name, gender, bio)
VALUES (
  'admin.fst@uinsgd.ac.id',
  '$2a$10$wK1/f2p9V6x3mJ8rL5y8u.8kZ5vH9qX2mN4pQ7rS0tU3vW6xY9zA2',
  'Admin Akademik FST UIN SGD',
  'admin',
  'UIN Sunan Gunung Djati Bandung - Dekanat FST',
  'Laki-laki',
  'Tim Moderasi & Penjaminan Mutu Komunitas Belajar Sebaya FST.'
)
ON CONFLICT (email) DO UPDATE SET role = 'admin';
```

- [ ] **Step 2: Perbarui `entity.go`, `dto.go`, dan `group_dto.go` dengan field `Gender`, `AccountStatus`, `RestrictionNote`, `PublicProfileResponse`, dan DTO Moderasi**

- [ ] **Step 3: Verifikasi kompilasi paket domain**
Run: `cd backend; go build ./internal/domain/...`
Expected: Selesai dengan exit code 0 tanpa error.

---

### Task 2: Profil Publik, Gender & Kompresi Foto Profil di Backend (`UserRepository`, `UserService`, `UserHandler`)

**Files:**
- Modify: `backend/internal/repository/user_repository.go`
- Modify: `backend/internal/service/user_service.go`
- Modify: `backend/internal/handler/user_handler.go`
- Modify: `backend/cmd/api/main.go`
- Modify: `backend/internal/service/auth_service_test.go`

**Interfaces:**
- Consumes: `domain.PublicProfileResponse`, `domain.UpdateProfileRequest` (dengan `Gender` dan `AvatarURL`)
- Produces:
  - `UserService.GetPublicProfile(ctx context.Context, targetUserID uuid.UUID) (*domain.PublicProfileResponse, error)`
  - Endpoint `GET /api/v1/users/:id/profile` (publik)

- [ ] **Step 1: Tulis pengujian unit gagal untuk validasi batas ukuran `AvatarURL`, penyimpanan `Gender`, dan pengambilan `GetPublicProfile`**
Tambahkan pengujian di `backend/internal/service/user_service_test.go` yang memverifikasi:
1. `UpdateProfile` menyimpan `gender` (`"Perempuan"`) dan `avatar_url` (`"data:image/webp;base64,..."`).
2. `UpdateProfile` menolak `avatar_url` > 65536 karakter dengan `ErrInvalidInput`.
3. `GetPublicProfile` mengembalikan profil pengguna beserta keahlian dan jumlah sesi yang dibimbing, tanpa membocorkan email/password.

- [ ] **Step 2: Jalankan pengujian untuk memastikan gagal sebelum implementasi**
Run: `cd backend; go test -v ./internal/service -run TestUserService`
Expected: FAIL.

- [ ] **Step 3: Implementasikan query di `user_repository.go`, logika di `user_service.go`, dan handler `GetPublicProfile` di `user_handler.go` serta rute `api.Get("/users/:id/profile", userHandler.GetPublicProfile)` di `main.go`**

- [ ] **Step 4: Jalankan pengujian untuk memastikan lulus**
Run: `cd backend; go test -v ./internal/service -run TestUserService`
Expected: PASS.

---

### Task 3: Moderasi Dua Tahap (*Auto-Restrict* $\ge 3$ Laporan/Minggu & Keputusan Admin *Restore/Suspend*)

**Files:**
- Modify: `backend/internal/repository/report_repository.go`
- Modify: `backend/internal/repository/group_repository.go`
- Modify: `backend/internal/service/engagement_service.go`
- Modify: `backend/internal/service/group_service.go`
- Modify: `backend/internal/service/membership_service.go`
- Modify: `backend/internal/handler/engagement_handler.go`
- Modify: `backend/cmd/api/main.go`
- Create: `backend/internal/service/engagement_service_test.go`

**Interfaces:**
- Consumes: `domain.AccountRestricted`, `domain.AccountSuspended`, `domain.ModerateUserRequest`
- Produces:
  - `EngagementService.ModerateUser(ctx context.Context, targetUserID uuid.UUID, req domain.ModerateUserRequest) error`
  - Endpoint `PATCH /api/v1/admin/users/:id/moderation`
  - Proteksi akun `restricted`/`suspended` di `GroupService.Create` dan `MembershipService.Join`

- [ ] **Step 1: Tulis pengujian unit di `engagement_service_test.go`**
Uji skenario berikut:
1. Laporan terhadap grup otomatis menautkan `ReportedUserID = group.HostID`.
2. Pelapor yang sama tidak dapat mengirim laporan duplikat (`pending`) ke target yang sama.
3. Ketika 3 pelapor berbeda (`reporter-1`, `reporter-2`, `reporter-3`) melaporkan pengguna yang sama dalam 7 hari terakhir, status akun pengguna otomatis berubah menjadi `restricted`.
4. Admin memanggil `ModerateUser` dengan `action: "restore"` $\to$ akun kembali `active` dan laporan menjadi `resolved`.
5. Admin memanggil `ModerateUser` dengan `action: "suspend"` $\to$ akun menjadi `suspended`, sesi miliknya dibatalkan (`cancelled`), dan laporan menjadi `resolved`.

- [ ] **Step 2: Jalankan pengujian unit untuk memastikan gagal**
Run: `cd backend; go test -v ./internal/service -run TestEngagementService`
Expected: FAIL.

- [ ] **Step 3: Implementasikan metode repositori, logika *auto-restrict* di `engagement_service.go`, pengecekan status akun di `group_service.go` & `membership_service.go`, serta endpoint admin di `engagement_handler.go` & `main.go`**

- [ ] **Step 4: Jalankan seluruh suite pengujian backend Go**
Run: `cd backend; go test -v ./...; go vet ./...`
Expected: PASS 100% dan bersih tanpa peringatan.

---

### Task 4: Kompresi Foto Perangkat (`imageCompressor.js`), Gender & Foto di `ProfileModal` & `AuthModal`, serta `UserAvatar`

**Files:**
- Create: `frontend/src/utils/imageCompressor.js`
- Create: `frontend/src/components/ui/UserAvatar.jsx`
- Modify: `frontend/src/components/profile/ProfileModal.jsx`
- Modify: `frontend/src/components/auth/AuthModal.jsx`
- Modify: `frontend/src/components/profile/ProfileModal.test.jsx`

**Interfaces:**
- Produces:
  - `compressImageFile(file: File): Promise<string>`
  - `<UserAvatar user={user} size="sm" | "md" | "lg" />`

- [ ] **Step 1: Tulis pengujian di `ProfileModal.test.jsx` untuk pemilihan gender dan unggah foto profil**
- [ ] **Step 2: Implementasikan `imageCompressor.js`, `UserAvatar.jsx`, serta perbarui `ProfileModal.jsx` dan `AuthModal.jsx`**
- [ ] **Step 3: Jalankan pengujian unit `ProfileModal.test.jsx` dan `AuthModal.test.jsx`**
Run: `cd frontend; npx vitest run src/components/profile/ProfileModal.test.jsx src/components/auth/AuthModal.test.jsx`
Expected: PASS.

---

### Task 5: Klik & Lihat Profil Pengguna Lain (`PublicProfileModal.jsx`)

**Files:**
- Create: `frontend/src/components/profile/PublicProfileModal.jsx`
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/components/groups/GroupCard.jsx`
- Modify: `frontend/src/components/groups/GroupDetailModal.jsx`
- Modify: `frontend/src/components/reports/ReportModal.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `userApi.getPublicProfile(userId)` (`GET /api/v1/users/:id/profile`)
- Produces: `<PublicProfileModal isOpen={...} userId={...} onClose={...} onReportUser={...} />`

- [ ] **Step 1: Tambahkan `userApi.getPublicProfile` di `client.js` dan buat `PublicProfileModal.jsx`**
Menampilkan foto profil (`UserAvatar`), nama lengkap, lencana gender, program studi FST, poin kontribusi tutor, bio, daftar mata kuliah yang dikuasai & ingin dipelajari, jumlah sesi yang dibimbing, serta tombol **"Laporkan Pengguna"** yang meneruskan `reportedUserId` ke `ReportModal`.
- [ ] **Step 2: Hubungkan klik nama/avatar Host di `GroupCard.jsx` (dengan `e.stopPropagation()` dan `z-10 relative` agar tidak berbenturan dengan overlay kartu) serta nama/avatar Host & Peserta di `GroupDetailModal.jsx` untuk membuka `PublicProfileModal`**
- [ ] **Step 3: Jalankan pengujian `GroupCard.test.jsx` dan `SessionModals.test.jsx`**
Run: `cd frontend; npx vitest run src/components/groups/GroupCard.test.jsx src/components/SessionModals.test.jsx`
Expected: PASS.

---

### Task 6: Dasbor Moderasi Admin (`AdminModerationModal.jsx`) & Banner Status Akun Dibatasi

**Files:**
- Create: `frontend/src/components/moderation/AdminModerationModal.jsx`
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/components/common/Navbar.jsx`
- Modify: `frontend/src/pages/HomePage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `engagementApi.listReports()`, `engagementApi.moderateUser(userId, payload)`
- Produces: `<AdminModerationModal isOpen={...} onClose={...} onModerated={...} />`

- [ ] **Step 1: Tambahkan `engagementApi.moderateUser(userId, payload)` di `client.js` dan bangun `AdminModerationModal.jsx`**
Menampilkan:
1. Ringkasan akun yang terkena **Pembatasan Otomatis (`restricted`)** ($\ge 3$ laporan minggu ini) atau `suspended`.
2. Daftar laporan lengkap beserta nama pelapor, nama terlapor, alasan, detail kronologi, dan waktu kejadian.
3. Tombol keputusan Admin: **Pulihkan Akses (`restore`)** dan **Tangguhkan Akun & Tutup Sesi (`suspend`)** disertai input catatan moderasi.
- [ ] **Step 2: Tampilkan tombol "Panel Moderasi" di `Navbar.jsx` untuk pengguna ber-role `admin`, serta tampilkan banner peringatan jelas di `HomePage.jsx` jika akun pengguna berstatus `restricted` atau `suspended`**
- [ ] **Step 3: Verifikasi dengan Vitest**
Run: `cd frontend; npx vitest run src/layouts/MainLayout.test.jsx src/App.test.jsx`
Expected: PASS.

---

### Task 7: Restrukturisasi UI Mobile (Bottom Navigation Bar), Pemangkasan *AI-Slop* Desktop, dan Tautan Footer Fungsional (`InfoGuideModal.jsx`)

**Files:**
- Create: `frontend/src/components/common/InfoGuideModal.jsx`
- Modify: `frontend/src/components/common/Footer.jsx`
- Modify: `frontend/src/components/common/Navbar.jsx`
- Modify: `frontend/src/layouts/MainLayout.jsx`
- Modify: `frontend/src/pages/HomePage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Produces:
  - `<InfoGuideModal isOpen={...} section={...} onClose={...} onOpenTutorSummary={...} />`
  - Mobile Fixed Bottom Navigation Bar (`aria-label="Navigasi seluler"`)
  - Compact Welcome Strip di `HomePage.jsx` tanpa duplikasi tombol

- [ ] **Step 1: Buat `InfoGuideModal.jsx` dan ubah 4 teks pasif di `Footer.jsx` (`Etika Belajar Sebaya`, `Panduan SKPI`, `Keamanan Komunitas`, `Pusat Bantuan`) menjadi `<button type="button">` interaktif yang membuka tab informasi nyata**
- [ ] **Step 2: Rombak `Navbar.jsx` dan `MainLayout.jsx` untuk Mobile**
- Pada `Navbar.jsx`, rapikan badge kampus agar tidak tertekuk 2 baris di layar ponsel (`FST • UIN SGD` ringkas di mobile, lengkap di desktop), gunakan `<UserAvatar />`, dan ubah `<nav aria-label="Navigasi seluler">` menjadi **Fixed Bottom Navigation Bar** (`fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200`) dengan urutan tombol tetap: `Sesi Saya`, `Buka Sesi`, `Keahlian`, `SKPI`.
- Tambahkan `pb-20 md:pb-8` pada `MainLayout.jsx` agar konten paling bawah tidak tertutup *Bottom Bar* di layar ponsel.
- [ ] **Step 3: Rombak Kartu Sambutan di `HomePage.jsx`**
- Hapus ke-3 tombol duplikat (`Bukti SKPI`, `Atur Keahlian`, `Buka Sesi Belajar`) dari dalam kartu sambutan pengguna terotentikasi karena sudah tersedia di Navbar (Desktop) dan Bottom Bar (Mobile).
- Padatkan teks sambutan yang bertele-tele menjadi identitas akademik ringkas (Foto profil, Nama, Gender badge, Prodi, Poin Tutor, dan chip Keahlian Dikuasai / Ingin Dipelajari dengan tautan `+ Kelola`).
- [ ] **Step 4: Jalankan seluruh suite pengujian Vitest, Vite Build, dan Go Tests**
Run: `cd frontend; npm test; npm run build; cd ../backend; go test -v ./...; go vet ./...`
Expected: Semua pengujian lulus 100% dan build produksi berhasil bersih.
