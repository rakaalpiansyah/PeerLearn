# DESIGN SYSTEM & THEME SPECIFICATION: PEERLEARN (LIGHT MODE)

> **Design Read:** Platform kolaborasi belajar sebaya akademik untuk mahasiswa perguruan tinggi Indonesia. Bahasa visual: *Academic Clarity & Clean Utilitarian* (terang, lapang, terstruktur, bebas jargon pengembang, dan tanpa efek visual berlebihan ala AI/alay).
> **Dials:** Variance: 6 | Motion: 4 | Density: 4

---

## 1. Filosofi Desain & Eliminasi "Elemen Bocor" (No-Leaks Policy)

### Masalah Utama Pada Desain Sebelumnya (Dark Theme & Dev Jargon):
1. **Bocoran Arsitektur Teknis:** Munculnya panel *"Infrastruktur & Arsitektur Sistem"* yang menampilkan *"Go Fiber Backend"*, *"Neon Tech PostgreSQL Serverless (aws-ap-southeast-1)"*, *"Stateless JWT & RBAC Active"*, dan tombol *"Ping Status"*. Bagi mahasiswa umum, informasi ini terasa seperti *debug dashboard* tugas kuliah dan merusak kesan kredibilitas produk formal.
2. **Bocoran Identitas Tugas Akademik:** Teks footer yang mencantumkan *"Kelompok 5"* membuat platform terlihat seperti prototipe tugas sementara, bukan platform komunitas kampus independen yang siap pakai.
3. **Estetika Gelap dengan Glow Ungu/Biru:** Terasa generik ala *template AI landing page*, kurang cocok dengan kenyamanan membaca materi teks akademis di siang/sore hari di lingkungan kampus.

### Prinsip Solusi:
- **100% User-Facing (Mahasiswa & Tutor):** Seluruh terminologi teknis diganti dengan nilai nyata bagi mahasiswa (Komitmen 100% Bebas Biaya, Etika Belajar Sebaya, Jaminan Keamanan Akun Kampus, dan Portofolio SKPI).
- **Clean Academic Light Theme:** Latar belakang putih/off-white kertas (*clean paper canvas*), tipografi berkontras tajam (*WCAG AAA compliant*), garis pemisah halus (*1px solid subtle borders*), dan saturasi warna yang terkendali.

---

## 2. Palet Warna (The Modern Academic Light Palette)

Palet warna didesain menggunakan fondasi *monochrome slate* dengan aksen tunggal *Deep Academic Cobalt* untuk memancarkan aura akademis kampus yang kredibel.

| Token | Nilai Hex | Peran & Penggunaan |
| :--- | :--- | :--- |
| **Canvas / Background** | `#F8FAFC` (Slate 50) | Latar belakang seluruh halaman; hangat, tidak menyilaukan mata |
| **Surface (Card & Modal)** | `#FFFFFF` (Pure White) | Permukaan kartu grup, modal dialog, formulir input, dan dropdown |
| **Surface Subdued** | `#F1F5F9` (Slate 100) | Latar belakang seksi sekunder, kotak informasi jadwal, dan avatar default |
| **Border / Divider** | `#E2E8F0` (Slate 200) | Batas struktur kartu dan garis pemisah; crisp `1px` presisi |
| **Border Strong** | `#CBD5E1` (Slate 300) | Garis batas elemen input saat diam dan pemisah penting |
| **Text Primary** | `#0F172A` (Slate 900) | Judul utama, nama grup, teks tombol penting (kontras > 12:1) |
| **Text Secondary** | `#475569` (Slate 600) | Deskripsi materi, petunjuk form, label meta (kontras > 5.5:1) |
| **Text Muted** | `#64748B` (Slate 500) | Tanggal, cap waktu, label institusi kecil |
| **Primary Brand (Cobalt)** | `#1D4ED8` (Blue 700) | Tombol CTA utama, tab aktif, ikon fokus akademik |
| **Primary Hover** | `#1E40AF` (Blue 800) | Interaksi hover tombol CTA utama |
| **Primary Light Surface** | `#EFF6FF` (Blue 50) | Latar belakang badge kategori teknologi, highlight info sesi |
| **Success (Emerald)** | `#059669` (Emerald 600) | Badge sesi luring, status disetujui, kehadiran terverifikasi |
| **Success Surface** | `#ECFDF5` (Emerald 50) | Latar belakang badge sukses / luring kampus |
| **Warning / SKPI (Amber)** | `#D97706` (Amber 600) | Poin kontribusi tutor, badge bintang ulasan, sertifikat SKPI |
| **Warning Surface** | `#FFFBEB` (Amber 50) | Latar belakang kartu SKPI dan peringatan kuota sisa 1 |
| **Danger (Rose)** | `#E11D48` (Rose 600) | Tombol tolak peserta, pesan error validasi formulir |

> [!IMPORTANT]
> **Larangan Mutlak (Anti-Slop Color Rules):**
> - DILARANG menggunakan gradien ungu neon (`purple-to-pink glow`).
> - DILARANG menggunakan bayangan tebal pekat (`shadow-2xl shadow-black`). Bayangan harus lembut: `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)`.
> - DILARANG menggunakan teks abu-abu pudar di bawah rasio 4.5:1.

---

## 3. Tipografi & Hierarki Visual

Menggunakan font modern sans-serif dengan karakter geometris-humanis yang terbaca jernih di layar resolusi tinggi maupun smartphone mahasiswa (*mobile-first*).

- **Font Family Utama:** `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Font Monospace (Kode & Registrasi SKPI):** `'JetBrains Mono', 'Fira Code', monospace`

### Skala Hierarki:
1. **Headline Beranda (Hero H1):** `text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight`
2. **Sub-headline / Section Title (H2):** `text-lg sm:text-xl font-bold text-slate-900 tracking-tight`
3. **Card Title (H3):** `text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors`
4. **Body Text:** `text-sm text-slate-600 leading-relaxed`
5. **Caption & Meta Labels:** `text-xs font-medium text-slate-500`
6. **Badge & Tag Text:** `text-[11px] font-semibold tracking-wide`

---

## 4. Redesain Komponen Utama (White / Light Mode)

### A. Navigasi Atas (Navbar)
- **Tampilan Lama:** Hitam pekat `bg-slate-950/85 border-slate-800`.
- **Tampilan Baru:**
  - Latar belakang: Putih bersih `bg-white/90 backdrop-blur-md border-b border-slate-200`.
  - Logo: Ikon Toga Akademik biru tua dengan teks tebal `PeerLearn` dan lencana `Komunitas Mahasiswa`.
  - Menu aksi: Tombol bersih bernuansa slate/blue (`Sesi Saya`, `Keahlian`, `SKPI`, `Buka Sesi Belajar`).
  - Indikator status: Lencana kecil hijau bersih: *"Sistem Aktif"* (tanpa teks database).

### B. Hero Banner & Sambutan Mahasiswa
- **Tampilan Lama:** Kotak gelap `#111722` dengan border redup.
- **Tampilan Baru:**
  - Latar belakang: Putih elegan `bg-white border border-slate-200/90 shadow-sm rounded-2xl p-6 sm:p-8`.
  - Header: Ucapan selamat datang personal, badge mahasiswa terverifikasi dengan nama perguruan tinggi.
  - Ringkasan Keahlian: Kotak kartu pastel halus (`bg-slate-50 border border-slate-200`) yang menampilkan mata kuliah yang dikuasai dan diminati.
  - Aksi Utama: Tombol kontras tinggi `Buka Sesi Belajar` (Cobalt Blue) dan `Bukti SKPI` (Warm Amber Outline).

### C. Kartu Sesi Belajar (GroupCard)
- **Tampilan Lama:** Kartu gelap pekat `#111722` yang menyatu dengan latar belakang.
- **Tampilan Baru:**
  - Kartu putih `bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 rounded-xl p-5`.
  - Kategori materi: Lencana pastel bersih (contoh: *Teknologi* `#EFF6FF text-blue-700 border-blue-200`).
  - Format sesi:
    - **Daring:** Lencana Indigo Pastel (`bg-indigo-50 text-indigo-700 border-indigo-200`).
    - **Luring:** Lencana Emerald Pastel (`bg-emerald-50 text-emerald-700 border-emerald-200`).
  - Indikator Agenda: Pill rapi `📋 3 Agenda Terstruktur` dengan ikon mini.
  - Lokasi & Waktu: Ikon kalender dan pin lokasi biru/emerald dengan teks slate terbaca jelas.
  - Profil Tutor: Avatar lingkaran bersahabat, nama tutor, dan akumulasi poin kontribusi berlogo bintang/award amber.

### D. Penggantian Panel "Infrastruktur Bocor" $\rightarrow$ "Pilar Kolaborasi Kampus"
Panel lama yang berisi server status & region AWS dihapus total, digantikan dengan:
- **Judul Seksi Baru:** `Komitmen Integritas Komunitas Belajar Sebaya`
- **Subjudul:** `Prinsip dasar interaksi akademik antar-mahasiswa di PeerLearn`
- **Tiga Kartu Nilai Nyata:**
  1. **100% Bebas Biaya & Nirlaba:** Dilaksanakan oleh sesama mahasiswa atas dasar kepedulian akademik, tanpa biaya registrasi apapun.
  2. **Verifikasi Identitas Kampus:** Memanfaatkan email resmi institusi (`.ac.id`) guna menjaga keamanan dan etika diskusi sesama civitas academica.
  3. **Portofolio Resmi SKPI:** Setiap jam pembimbingan tutor terakumulasi otomatis dan dapat dicetak sebagai bukti keterlibatan sosial akademik.

### E. Redesain Footer
- **Tampilan Lama:** `© 2026 PeerLearn • Proyek Kolaborasi Belajar Komunitas (Kelompok 5) | Clean Architecture...`
- **Tampilan Baru:**
  - `bg-white border-t border-slate-200 py-8 text-xs text-slate-500`
  - Kiri: `© 2026 PeerLearn. Platform Kolaborasi Belajar Komunitas Mahasiswa Indonesia.`
  - Kanan: Tautan fungsional ramah pengguna: `Panduan Etika Belajar • Informasi SKPI • Kebijakan Komunitas • Pusat Bantuan`.

### F. Modal Dialog (Group Detail, Create Group, SKPI Certificate)
- Latar belakang dialog: Putih bersih `bg-white border border-slate-200 shadow-xl rounded-2xl`.
- Header: Teks tebal gelap, pemisah garis halus.
- Peta OpenStreetMap: Diberi bingkai `border border-slate-300 rounded-xl` yang kontras dan bersih.
- Ruang Diskusi (Chat):
  - Pesan pengguna sendiri: Gelembung biru cobalt dengan teks putih tajam.
  - Pesan anggota lain: Gelembung abu-abu terang `bg-slate-100 text-slate-900 border border-slate-200`.

---

## 5. Rencana Penerapan (Implementation Matrix)

| Komponen / Halaman | File Terkait | Rincian Perubahan |
| :--- | :--- | :--- |
| **Global Theme** | `frontend/src/index.css` | Mengubah default background dari hitam ke `#F8FAFC`, atur default text `#0F172A`, sesuaikan scrollbar dan selection color |
| **Layout Shell** | `frontend/src/layouts/MainLayout.jsx` | Latar belakang putih/slate-50, wrapper kontainer bersih |
| **Navigasi Utama** | `frontend/src/components/common/Navbar.jsx` | Header putih sticky, border slate-200, tombol navigasi terang |
| **Footer** | `frontend/src/components/common/Footer.jsx` | Hapus "Kelompok 5" & info teknis database, ubah ke tautan platform komunitas |
| **Beranda** | `frontend/src/pages/HomePage.jsx` | Hero terang, hapus seksi debug server, ganti dengan 3 kartu nilai komunitas, perbaiki filter bar |
| **Kartu Sesi** | `frontend/src/components/groups/GroupCard.jsx` | Card putih, border slate-200, hover shadow elegan |
| **UI Primitives** | `Button.jsx`, `Input.jsx`, `Badge.jsx`, `Modal.jsx` | Sesuaikan varian light mode yang berbobot |
| **Modal Fitur** | `GroupDetailModal.jsx`, `CreateGroupModal.jsx`, `SkillsModal.jsx`, `TutorSummaryModal.jsx` | Latar dialog putih, teks kontras tinggi, input terang |
