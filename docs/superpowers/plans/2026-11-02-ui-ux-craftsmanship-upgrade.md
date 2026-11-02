# UI/UX & Craftsmanship Elevation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Meningkatkan estetika visual, ergonomi mobile, aksesibilitas WCAG AA, dan pengalaman interaksi (micro-feedback) platform PeerLearn ke level *Senior Craftsmanship* tanpa merusak fungsionalitas yang ada.

**Architecture:** Component-Driven React 19 + Tailwind CSS v4, pola State-Machine sederhana untuk Toast Feedback, Accessible Dialog & Semantics, Ergonomic Mobile Bottom App Bar, serta Live Debounced Query.

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React, Vitest, React Testing Library.

**Spec:** [UI_UX_AUDIT_PEERLEARN.md](file:///C:/Users/ASUS/.gemini/antigravity-cli/brain/e75daedd-ec9d-4d78-a292-8c74a98423c6/UI_UX_AUDIT_PEERLEARN.md)

## Global Constraints

- Wajib mempertahankan semua 175 pengujian Vitest yang sudah ada (tidak boleh ada regresi pada dialog, auth, form validation, atau recovery).
- Semua rasio kontras teks wajib memenuhi standar WCAG AA (minimal 4.5:1 untuk normal text, 3:1 untuk bold display text).
- Target area sentuh (touch targets) mobile wajib minimal 44x44px sesuai pedoman aksesibilitas mobile.
- Dilarang menambahkan dependensi eksternal yang tidak perlu; gunakan utilitas React standar dan styling Tailwind CSS yang sudah terkonfigurasi.
- Komentar kode bebas AI-slop (*no filler comments*). Tulis kode yang deskriptif dan self-explanatory.

## Review Focus

1. **Mobile Bottom Navigation Transition**: Pastikan navigasi bawah tidak menutupi footer atau konten bagian paling bawah layar (sediakan `pb-20 md:pb-0` pada kontainer halaman).
2. **Accessible Keyboard Order**: Pastikan link "Lewati ke konten" (*Skip link*) benar-benar memindahkan fokus keyboard ke elemen `<main id="main-content">` saat ditekan.
3. **Live Debounce Filtering**: Pastikan input pencarian tidak memicu request ganda saat pengguna mengetik cepat, dan tetap menghormati filter kategori serta format daring/luring yang sedang aktif.
4. **Toast Accessibility**: Pastikan notifikasi toast memiliki atribut `role="status"` atau `aria-live="polite"` sehingga diumumkan oleh screen reader tanpa mengganggu fokus keyboard.
5. **Modal Chat Height pada Layar Pendek**: Pastikan dialog ruang diskusi pada layar resolusi tinggi rendah (misal 360x640px) tidak menyembunyikan input kirim pesan.

---

### Task 1: Accessibility & Contrast Hardening (WCAG AA Compliance)

**Files:**
- Modify: `frontend/src/layouts/MainLayout.jsx`
- Modify: `frontend/src/components/groups/GroupCard.jsx`
- Modify: `frontend/src/components/groups/GroupDetailModal.jsx`
- Modify: `frontend/src/components/common/Navbar.jsx`
- Test: `frontend/src/layouts/MainLayout.test.jsx`

**Interfaces:**
- Produces: Accessible landmark `<a href="#main-content">` dan kontras teks yang memenuhi rasio >= 4.5:1.
- Consumes: Tailwind CSS color scale (`slate-600`, `slate-700`, `amber-800`, `emerald-800`).

- [ ] **Step 1: Tulis unit test untuk Skip-To-Content link di MainLayout**

Pastikan test memverifikasi kehadiran elemen tautan lompat ke konten dengan atribut `href="#main-content"` dan kontainer utama memiliki `id="main-content"` dengan `tabIndex="-1"`.

```javascript
it("renders a skip to content link targeted at main content landmark", () => {
  render(
    <MainLayout isBackendOnline={true}>
      <div>Konten Halaman</div>
    </MainLayout>
  );
  const skipLink = screen.getByRole("link", { name: /lewati ke konten utama/i });
  expect(skipLink).toBeInTheDocument();
  expect(skipLink).toHaveAttribute("href", "#main-content");
  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
});
```

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan**

Run: `cd frontend; npm test src/layouts/MainLayout.test.jsx`
Expected: FAIL (skip link not found).

- [ ] **Step 3: Implementasikan Skip Link dan perbaikan kontras teks**

1. Di `MainLayout.jsx`, tambahkan:
   ```jsx
   <a
     href="#main-content"
     className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
   >
     Lewati ke konten utama
   </a>
   ```
   dan tambahkan `id="main-content" tabIndex={-1}` pada tag `<main>`.
2. Di `GroupCard.jsx`, perbarui warna teks poin tutor dari `text-amber-700` menjadi `text-amber-800 font-semibold`, dan teks peserta dari `text-[10px] text-slate-500` menjadi `text-[11px] text-slate-600`.
3. Di `GroupDetailModal.jsx`, berikan `aria-label="Ubah status sesi belajar"` pada elemen `<select>`.
4. Di `Navbar.jsx`, perbarui label role subtext mobile agar kontrasnya di atas 4.5:1.

- [ ] **Step 4: Jalankan test kembali untuk memverifikasi kelulusan**

Run: `cd frontend; npm test src/layouts/MainLayout.test.jsx`
Expected: PASS.

- [ ] **Step 5: Jalankan seluruh suite test untuk memastikan tidak ada efek samping**

Run: `cd frontend; npm test`
Expected: PASS (seluruh 175+ tests).

---

### Task 2: Mobile Bottom Navigation Bar (Ergonomic Thumb-Zone)

**Files:**
- Modify: `frontend/src/components/common/Navbar.jsx`
- Modify: `frontend/src/layouts/MainLayout.jsx`
- Modify: `frontend/src/pages/HomePage.jsx`
- Test: `frontend/src/components/common/Navbar.test.jsx` (atau test file terkait)

**Interfaces:**
- Produces: Fixed Bottom Navigation Bar untuk mobile viewports (<768px), dengan padding penyesuai pada layout utama (`pb-20 md:pb-0`).
- Consumes: Action handlers (`onOpenMySessions`, `onOpenCreateGroup`, `onOpenSkills`, `onOpenTutorSummary`).

- [ ] **Step 1: Tulis unit test untuk navigasi seluler bawah**

Verifikasi bahwa elemen navigasi mobile memiliki `aria-label="Navigasi seluler"` dan tombol aksi beroperasi dengan baik.

- [ ] **Step 2: Jalankan test untuk memverifikasi perilaku**

Run: `cd frontend; npm test src/components/common/Navbar.test.jsx` (atau `MainLayout.test.jsx`).

- [ ] **Step 3: Implementasikan Ergonomic Bottom App Bar**

1. Pindahkan markup navigasi seluler di `Navbar.jsx` dari strip header atas menjadi fixed bottom bar:
   ```jsx
   <nav
     aria-label="Navigasi seluler"
     className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 md:hidden flex items-center justify-around shadow-lg"
   >
     {/* Tombol Sesi Saya, Buka Sesi, Keahlian, SKPI dengan ikon vertikal & touch target min 48px */}
   </nav>
   ```
2. Berikan padding bawah `pb-24 md:pb-10` pada `<main>` di `MainLayout.jsx` agar konten halaman tidak terhalang oleh bottom navigation bar.

- [ ] **Step 4: Jalankan tes vitest**

Run: `cd frontend; npm test`
Expected: PASS.

---

### Task 3: Lightweight Global Toast Feedback System

**Files:**
- Create: `frontend/src/context/ToastContext.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/groups/GroupDetailModal.jsx`
- Modify: `frontend/src/components/feedback/FeedbackModal.jsx`
- Modify: `frontend/src/components/reports/ReportModal.jsx`
- Create: `frontend/src/context/ToastContext.test.jsx`

**Interfaces:**
- Produces: `useToast()` hook yang mengekspos `showToast(message, type = 'success' | 'info' | 'error')`.
- Consumes: React Context & auto-dismiss timer.

- [ ] **Step 1: Tulis test untuk Toast Provider dan trigger**

```javascript
it("shows toast notification on trigger and auto-dismisses", async () => {
  // Test toast rendering and dismiss behavior
});
```

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan**

Run: `cd frontend; npm test src/context/ToastContext.test.jsx`
Expected: FAIL (file not yet created).

- [ ] **Step 3: Implementasikan `ToastContext.jsx`**

Buat container toast mengambang di pojok kanan bawah (desktop) atau tengah bawah (mobile) dengan animasi smooth enter/exit, ikon status yang relevan, dan `role="status"`. Hubungkan ke aksi:
- Saat user meminta bergabung ke grup: "Permintaan bergabung telah dikirim ke host!"
- Saat feedback berhasil dikirim: "Terima kasih, ulasan Anda telah disimpan."
- Saat laporan dikirim: "Laporan telah diterima untuk ditinjau tim komunitas."

- [ ] **Step 4: Jalankan test untuk memverifikasi**

Run: `cd frontend; npm test src/context/ToastContext.test.jsx`
Expected: PASS.

---

### Task 4: Live Debounced Search & Dynamic Chat Heights

**Files:**
- Create: `frontend/src/hooks/useDebounce.js`
- Create: `frontend/src/hooks/useDebounce.test.js`
- Modify: `frontend/src/pages/HomePage.jsx`
- Modify: `frontend/src/components/groups/GroupDetailModal.jsx`
- Test: `frontend/src/pages/HomePage.test.jsx`

**Interfaces:**
- Produces: `useDebounce(value, delayMs = 300)` hook.
- Consumes: `search` text input state di `HomePage.jsx`.

- [ ] **Step 1: Tulis test untuk hook `useDebounce`**

Verifikasi bahwa nilai output hanya terbarui setelah jeda waktu yang ditentukan.

- [ ] **Step 2: Implementasikan `useDebounce.js`**

- [ ] **Step 3: Integrasikan `useDebounce` pada filter katalog di `HomePage.jsx`**

Biarkan pengguna mengetik topik/materi dan saring katalog secara otomatis tanpa harus menekan Enter, sembari tetap menjaga pembatalan race-condition yang sudah ada.

- [ ] **Step 4: Sesuaikan tinggi chat container di `GroupDetailModal.jsx`**

Ubah `h-[460px]` kaku menjadi `h-[min(480px,52dvh)]` sehingga fleksibel pada semua dimensi layar smartphone.

- [ ] **Step 5: Jalankan seluruh test suite**

Run: `cd frontend; npm test`
Expected: PASS (100% tests passing).

---

### Task 5: Visual Elevation, Typographic Contrast & Craft Finish

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx` (Hero styling & filter scroll indicator)
- Modify: `frontend/src/components/groups/GroupCard.jsx` (Micro-interaction & hover elevation)
- Modify: `frontend/src/index.css` (Reduced-motion media query)
- Test: `frontend/src/pages/HomePage.test.jsx` & `frontend/src/components/groups/GroupCard.test.jsx`

- [ ] **Step 1: Verifikasi test saat ini**

Run: `cd frontend; npm test`

- [ ] **Step 2: Tambahkan sentuhan visual craftsmanship**

1. Hero: Berikan aksen tipografi berbobot dengan letter-spacing yang presisi (`tracking-tight`), aksen visual dot pattern halus, dan badge statistik komunitas.
2. GroupCard: Tambahkan micro-interaction halus pada hover (`hover:-translate-y-0.5 transition-all duration-200`) dan border polish.
3. Filter chips: Berikan visual indicator tepi scroll di mobile.
4. CSS: Pasang `@media (prefers-reduced-motion: reduce)` yang mematikan transisi berlebihan secara elegan tanpa merusak visibilitas elemen.

- [ ] **Step 3: Jalankan verifikasi menyeluruh (Test & Production Build)**

Run:
1. `cd frontend; npm test`
2. `cd frontend; npm run build`
3. `cd backend; go test ./...`
Expected: Seluruh unit test lulus dan build terkompilasi bersih tanpa peringatan.
