# Desain Arsitektur End-to-End: Moderasi Bertahap, Profil Publik (Foto & Gender), dan Restrukturisasi UI Mobile/Desktop

**Tanggal:** 2 November 2026
**Proyek:** PeerLearn (Fakultas Sains dan Teknologi, UIN Sunan Gunung Djati Bandung)
**Status:** Disetujui Pengguna (Opsi A — Terpadu dalam Arsitektur SPA + Kompresi Canvas In-Browser)

---

## 1. Tujuan & Alasan (*Intent & Why*)

Mengangkat kualitas **PeerLearn** dari sekadar prototipe fungsional menjadi produk kampus kelas produksi (*Senior Software Engineer Standard*) yang:
1. **Bebas dari Tautan Mati (*Dead Links*) & Duplikasi Kontrol (*Anti-Slop*):** Menghapus pengulangan tombol yang memakan lebih dari separuh layar mobile dan mengubah tautan pasif di Footer menjadi dialog panduan fungsional.
2. **Transparan secara Identitas Akademik:** Mahasiswa dapat mengunggah foto profil dari perangkat (dikompresi otomatis di sisi klien), mencantumkan identitas gender, serta mengklik profil penyelenggara (*Host*) atau peserta lain untuk memeriksa rekam jejak akademik, mata kuliah yang dikuasai, dan poin kontribusi sebelum bergabung.
3. **Memiliki Sistem Keamanan & Moderasi Dua Tahap:** Melindungi ekosistem akademik FST dari penyalahgunaan (joki tugas komersial, spam, pelecehan) dengan **pembatasan otomatis sementara (`restricted`)** ketika seorang pengguna dilaporkan oleh $\ge 3$ pelapor unik dalam 7 hari terakhir, dilanjutkan dengan **keputusan akhir oleh Admin** melalui **Dasbor Moderasi Admin** untuk memulihkan akses (`active`) atau menangguhkan akun (`suspended`).

---

## 2. Sasaran, Non-Sasaran, dan Anti-Sasaran (*Goals, Non-Goals, Anti-Goals*)

### Sasaran (*Goals*)
- **Database & Backend (Go Clean Architecture):**
  - Migrasi `000004_moderation_and_user_profile.sql`:
    - Mengubah kolom `avatar_url` di tabel `users` menjadi `TEXT` agar dapat menyimpan Data URL WebP/JPEG terkompresi (`< 35 KB`).
    - Menambahkan kolom `gender VARCHAR(20) DEFAULT ''` (`Laki-laki`, `Perempuan`, atau kosong) dan `account_status VARCHAR(20) NOT NULL DEFAULT 'active'` (`active`, `restricted`, `suspended`) serta `restriction_note TEXT DEFAULT ''` pada tabel `users`.
    - Menambahkan indeks pencarian laporan 7 hari terakhir dan pencegahan duplikasi laporan dari pelapor yang sama terhadap target yang sama dalam status `pending`.
    - Menambahkan akun moderator default (`admin.fst@uinsgd.ac.id`, kata sandi `password123`, `role = 'admin'`) serta menormalisasi data lama yang masih bertuliskan `Universitas Indonesia` menjadi `UIN SGD Bandung - Fakultas Sains & Teknologi`.
  - Endpoint Profil Publik: `GET /api/v1/users/:id/profile` mengembalikan data publik pengguna (nama, prodi, gender, bio, avatar, poin kontribusi, status akun, daftar keahlian `mastered` & `learning`, serta jumlah sesi yang pernah dibimbing).
  - Logika *Auto-Restrict* di `EngagementService.CreateReport`:
    - Jika laporan menyasar sebuah sesi (`target_group_id`) dan `reported_user_id` kosong, sistem otomatis mengisi `reported_user_id` dengan `host_id` sesi tersebut.
    - Menghitung jumlah pelapor unik (`COUNT(DISTINCT reporter_id)`) terhadap `reported_user_id` dalam 7 hari terakhir.
    - Jika mencapai **$\ge 3$ pelapor unik**, status pengguna otomatis berubah menjadi `restricted` dengan catatan sistem.
    - Pengguna berstatus `restricted` atau `suspended` ditolak (`403 Forbidden`) saat mencoba membuat sesi baru (`POST /groups`), mendaftar sesi (`POST /groups/:id/join`), atau mengirim pesan chat (`POST /groups/:id/messages`), serta sesi `open` miliknya disembunyikan dari katalog publik.
  - Endpoint Moderasi Admin:
    - `GET /api/v1/admin/moderation` (atau memperkaya `GET /api/v1/admin/reports` dengan data pelapor, terlapor, judul grup, dan akumulasi jumlah laporan 7 hari terakhir).
    - `PATCH /api/v1/admin/users/:id/moderation` untuk mengambil keputusan:
      - `action: "restore"` $\to$ Mengembalikan `account_status = 'active'`, menghapus `restriction_note`, dan menandai laporan terkait menjadi `resolved`.
      - `action: "suspend"` $\to$ Mengubah `account_status = 'suspended'`, menyimpan alasan admin ke `restriction_note`, membatalkan (`cancelled`) seluruh sesi aktif milik pengguna tersebut, dan menandai laporan menjadi `resolved`.
- **Frontend (React + Vite):**
  - **Kompresi Foto Profil Klien (`utils/imageCompressor.js`):** Memotong gambar secara *center-crop* $1:1$ ke ukuran maksimal `256x256` piksel menggunakan HTML5 `<canvas>` dan mengekspornya ke `image/webp` (fallback `image/jpeg`, kualitas `0.8`) di bawah `30 KB`.
  - **Pembaruan `AuthModal.jsx` & `ProfileModal.jsx`:** Pilihan Gender (`Laki-laki` / `Perempuan`) dan tombol unggah foto dari perangkat disertai pratinjau langsung & tombol hapus foto.
  - **Komponen `PublicProfileModal.jsx`:** Terbuka saat pengguna mengklik nama/avatar Host di `GroupCard.jsx` atau nama/avatar Host & Peserta di `GroupDetailModal.jsx`. Menampilkan foto/avatar, lencana gender & prodi FST, bio, poin tutor, keahlian, jumlah sesi yang dibimbing, dan tombol **"Laporkan Pengguna"**.
  - **Komponen `AdminModerationModal.jsx`:** Tombol **"Moderasi"** (dengan indikator jumlah laporan `pending`) tampil di Navbar khusus bagi akun dengan `role === "admin"`, serta tombol akses cepat demo Admin di lingkungan pengembangan. Menampilkan daftar pengguna yang terkena *auto-restrict* dan daftar laporan lengkap beserta alasan dan tombol eksekusi **Pulihkan Akses** / **Tangguhkan Akun**.
  - **Banner Status Akun (`restricted` / `suspended`):** Jika pengguna yang sedang login berstatus `restricted` atau `suspended`, tampil pemberitahuan jelas di bagian atas halaman mengenai alasan pembatasan dan status peninjauan admin.
  - **Restrukturisasi Mobile & Desktop UI (`Navbar.jsx`, `HomePage.jsx`, `Footer.jsx`):**
    - Mobile: Memindahkan `nav[aria-label="Navigasi seluler"]` menjadi **Fixed Bottom Navigation Bar** yang ergonomis, merapikan header mobile menjadi 1 baris bersih (`FST • UIN SGD` ringkas), dan menghapus pengulangan tombol `Bukti SKPI`, `Atur Keahlian`, `Buka Sesi Belajar` di dalam kartu sambutan `HomePage.jsx` karena sudah ada di navigasi utama.
    - Desktop: Memadatkan kartu sambutan pengguna menjadi *Compact Academic Identity Strip* yang menampilkan foto profil, nama, prodi, gender, ringkasan keahlian yang dikuasai/dipelajari (dengan tombol `+ Edit` ringkas), tanpa menduplikasi tombol Navbar.
    - Footer: Mengubah 4 teks pasif (`Etika Belajar Sebaya`, `Panduan SKPI`, `Keamanan Komunitas`, `Pusat Bantuan`) menjadi tombol `<button type="button">` fungsional yang membuka dialog panduan ringkas (`InfoGuideModal.jsx`) atau modal SKPI.

### Non-Sasaran (*Non-Goals*)
- Penyimpanan objek awan eksternal (AWS S3 / Google Cloud Storage) tidak digunakan agar aplikasi tetap mandiri (*zero external storage dependency*).
- Pembuatan halaman terpisah dengan `react-router-dom` tidak dilakukan demi mempertahankan arsitektur modal SPA dan menjaga kompatibilitas penuh dengan 176 pengujian Vitest yang ada.

### Anti-Sasaran (*Anti-Goals*)
- Tidak boleh ada elemen yang memiliki `cursor-pointer` tetapi tidak melakukan apa-apa saat diklik.
- Tidak boleh ada tombol aksi identik yang muncul berurutan di layar yang sama pada tampilan ponsel.
- Tidak boleh ada teks bertele-tele ala AI generik.

---

## 3. Batasan Teknis (*Constraints*)

1. **Kontrak Pengujian Eksisting Wajib Lulus 100%:**
   - `MainLayout.test.jsx` memverifikasi `navigation[name="Navigasi akun"]` dan `navigation[name="Navigasi seluler"]` beserta urutan fokus `Tab` dari tombol `Sesi Saya` ke `Buka Sesi`.
   - `HomePage.test.jsx` dan `App.test.jsx` memverifikasi alur katalog, rekomendasi, dan fokus dialog `<dialog>`.
2. **Ukuran Payload Avatar:** Maksimal `65536` karakter (64 KB) divalidasi di backend Go agar database tetap cepat dan ringan.

---

## 4. Ringkasan Pendekatan yang Dipilih (*Selected Approach*)

- **Opsi A (Terpadu dalam Arsitektur Modal & Bottom-Nav SPA + Kompresi Canvas In-Browser)** dipilih dibanding Opsi B (Multi-Page Routing + Disk Upload) karena kompatibel penuh dengan Neon Tech Serverless PostgreSQL, tidak meninggalkan file yatim saat container *restart*, dan menjaga keutuhan seluruh pengujian unit yang sudah berjalan.
