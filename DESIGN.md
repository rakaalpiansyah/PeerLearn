# DESIGN.md: PeerLearn UIN Sunan Gunung Djati Bandung

## 1. Product Identity & Surface Mode

- **Product:** PeerLearn (Platform Kolaborasi Belajar Sebaya Mahasiswa)
- **Institutional Scope:** Seluruh 9 Fakultas dan Pascasarjana di Universitas Islam Negeri (UIN) Sunan Gunung Djati Bandung, mencakup Kampus 1 Cibiru (Jl. A.H. Nasution No. 105) dan Kampus 2 Cimencrang (Gedebage).
- **Primary Surface Mode:** **Operate** (eksplorasi katalog sesi, manajemen profil dan keahlian lintas fakultas, koordinasi ruang diskusi privat, serta ruang kerja kurasi admin).
- **Design Dials:** `ENERGY: 2` | `RHYTHM: 2` | `MOTION: 2`
  - Bahasa visual bersih, tenang, dan siap pakai untuk mahasiswa membaca jadwal serta materi belajar di lingkungan kampus.
  - Tanpa efek glow dekoratif, tanpa kartu metrik fiktif, dan tanpa istilah infrastruktur pengembang.

---

## 2. Color System (Single Brand Lock: Emerald Akademik UIN SGD)

Semua komponen UI memakai palet tunggal **Emerald Akademik** di atas kanvas **Warm/Neutral Slate**. Penggunaan token Cobalt Blue lama (`#1D4ED8`) dan glow ungu AI dilarang.

| Token | Hex | Role |
| :--- | :--- | :--- |
| `--bg-canvas` | `#F8FAFC` | Latar belakang utama halaman |
| `--bg-surface` | `#FFFFFF` | Permukaan kartu sesi, panel admin, dan modal dialog |
| `--bg-surface-hover` | `#F1F5F9` | Permukaan sekunder, input non-aktif, tab track |
| `--border-subtle` | `#E2E8F0` | Garis pemisah struktural 1px |
| `--border-hover` | `#CBD5E1` | Garis batas input dan kontrol aktif |
| `--text-primary` | `#0F172A` | Judul utama, nama sesi, label tombol primer (kontras > 12:1) |
| `--text-secondary` | `#475569` | Deskripsi materi, metadata jadwal, teks pembantu (kontras > 5.5:1) |
| `--text-muted` | `#64748B` | Stempel waktu dan catatan sekunder (di atas latar putih/slate-50) |
| `--brand-primary` | `#047857` | Aksi utama (CTA), indikator aktif, aksen resmi UIN SGD |
| `--brand-hover` | `#065F46` | State hover tombol utama |
| `--brand-surface` | `#ECFDF5` | Latar status aktif dan badge terverifikasi (`text-emerald-800` / `900`) |
| `--alert-amber` | `#D97706` | Status menunggu persetujuan, kuota hampir penuh, poin SKPI |
| `--danger-rose` | `#E11D48` | Penolakan, pembatalan, validasi error, moderasi akun |

### Aturan Kontras & Permukaan Berwarna
1. Semua teks normal wajib memenuhi rasio kontras WCAG AA minimum **4.5:1** (`3:1` untuk teks besar 18px+).
2. **Dilarang `gray-on-color`**: jangan menaruh `text-slate-*` di atas permukaan berwarna (`bg-emerald-50`, `bg-blue-50`, `bg-rose-50`, `bg-amber-50`, `bg-teal-50`). Gunakan warna turunan hue latar yang lebih gelap (mis. `text-emerald-900` di atas `bg-emerald-50`) atau netral di atas netral (`bg-slate-100 text-slate-700`).
3. Pilihan teks browser (`::selection`) memakai `rgba(4, 120, 87, 0.18)` dan teks `#0F172A`.

---

## 3. Typography

- **Primary Sans:** `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Monospace (Khusus Nomor Registrasi SKPI & Koordinat GPS):** `'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace`
- Dimuat sekali saja melalui `<link>` di `frontend/index.html` (dilarang `@import` ganda di CSS).
- Tracking judul dijaga pada `-0.015em` hingga `-0.025em` (tidak lebih ketat dari `-0.04em`).
- Angka penghitung, kuota, dan tanggal sejajar menggunakan `tabular-nums`.

---

## 4. Layout, Accessibility & Anti-Slop Rules

1. **Zero Em-Dash (`—`)**: gunakan titik dua `:`, koma `,`, titik `.`, atau tanda kurung `()` sebagai pemisah klausa dan judul.
2. **Zero Side-Tab Borders**: jangan memakai `border-l-4` atau `border-l-2` tebal sebagai aksen kartu, item daftar percakapan, atau kutipan balasan; gunakan kontras permukaan dan border penuh tipis.
3. **Zero Raw UI Emoji**: gunakan ikon dari `lucide-react` secara konsisten pada tombol dan chip lokasi; jangan gunakan emoji mentah sebagai pengganti ikon kontrol.
4. **Honest Real Content**: setiap kartu atau preview di Hero wajib berasal dari data katalog nyata atau menampilkan ringkasan ruang lingkup kampus secara jujur saat katalog kosong. Dilarang menampilkan nama tutor atau angka kuota rekaan.
5. **Working Controls Only**: setiap link dan tombol di navigasi harus langsung membuka halaman, bagian, atau dialog yang benar-benar berfungsi untuk peran pengguna saat itu.
6. **Touch Targets & Mobile Reflow**: kontrol interaktif pada layar sempit minimal `44px` (`min-h-[44px]`), bebas horizontal overflow pada viewport `360px` hingga `1536px`.
7. **Shape Consistency**: kartu dan kontainer utama memakai `rounded-2xl` (`16px`), kontrol dan input memakai `rounded-xl` (`12px`), badge status memakai `rounded-full` atau `rounded-md` (`6px`).
