# AGENTS.md — Professional Engineering Guidelines for PeerLearn

Project: **PeerLearn** (Platform Kolaborasi Belajar Komunitas)
Architecture: **Clean Architecture (Go Backend) + Component-Driven (React SPA Frontend) + Neon Tech (PostgreSQL)**

---

## 1. Core Engineering Mandates

Setiap agen atau pengembang yang bekerja pada repositori ini **WAJIB** menerapkan standar rekayasa perangkat lunak profesional tingkat tinggi (*Senior Software Engineer Standards*). Jangan pernah menghasilkan *code slop*, komentar basi (*AI-slop comments*), atau desain visual yang terasa seperti *template* AI generik.

Wajib mengaktifkan dan mengintegrasikan prinsip-prinsip dari skill berikut:
1. **Superpowers Methodology (`superpowers`)**:
   - Disiplin alur kerja: `brainstorming` -> `writing-plans` -> `executing-plans` -> `verification-before-completion`.
   - Penerapan **Test-Driven Development (TDD)** untuk logika bisnis esensial (kuota grup, otorisasi sesi, kalkulasi reputasi).
   - Penyelidikan akar masalah sistematis menggunakan `systematic-debugging` (dilarang *trial-and-error* membabi buta).
   - Selalu tunjukkan *evidence* (hasil test/log/eksekusi) sebelum menyatakan sebuah fitur selesai.
2. **Anti-Slop (`antislop`, `antislop-code`, `antislop-copywriting`)**:
   - **No AI Filler Comments:** Dilarang keras menulis komentar tidak berguna seperti `// handle submit`, `// state for loading`, `// get user by id`. Hanya tulis komentar untuk keputusan teknis non-intuitif atau aturan domain kompleks.
   - **No Marketing AI Clichés:** Dilarang menggunakan kata klise seperti "Solusi seamless untuk masa depan belajar Anda", "Unlock your ultimate potential", dll. Gunakan salinan teks yang membumi, lugas, dan relevan dengan mahasiswa kampus.
3. **Bespoke Design & Craftsmanship (`design-taste-frontend`, `impeccable`)**:
   - Desain harus berkarakter, memiliki hierarki visual yang kuat, tipografi berbobot, dan *spacing* konsisten.
   - Jangan gunakan kartu abu-abu membosankan dengan efek glow gradien ungu/indigo generik ala AI.
   - Sediakan *state* lengkap: Loading Skeleton (bukan sekadar spinner liar), Empty State yang mengedukasi, Error State yang manusiawi, dan Active/Hover states.

---

## 2. Backend Standard: Clean Architecture (Golang)

Backend wajib menerapkan pemisahan tanggung jawab (*Separation of Concerns*) yang ketat menggunakan pola Clean Architecture:

```text
backend/
├── cmd/api/main.go            # Wire dependencies & start HTTP server
├── internal/
│   ├── config/                # Environment configuration
│   ├── domain/                # Core entities, structs, & interfaces (No external DB imports)
│   ├── repository/            # Data Access Layer (PostgreSQL / SQL queries / GORM)
│   ├── service/               # Business Logic Layer (Use-cases, domain validation)
│   ├── handler/               # HTTP Transport Layer (Fiber/Chi, decode JSON, HTTP status)
│   └── middleware/            # JWT auth, CORS, logging, role-based guard
```

### Aturan Baku Golang:
- **Dependency Injection:** Handler bergantung pada Service Interface; Service bergantung pada Repository Interface. Ini memungkinkan unit test yang mudah di-mock.
- **Error Handling:** Jangan pernah mengabaikan error (`_ = err`). Tangani error secara eksplisit dan bungkus dengan konteks (`fmt.Errorf("service.CreateGroup: %w", err)`). Dilarang keras menggunakan `panic()` dalam request lifecycle.
- **Response Format Konsisten:**
  ```json
  {
    "success": true,
    "message": "Operasi berhasil",
    "data": { ... }
  }
  ```
  atau format error:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "Deskripsi kesalahan",
      "details": [ ... ]
    }
  }
  ```
- **Koneksi Database:** Gunakan koneksi *pooled* (PgBouncer compatible) untuk Neon Tech PostgreSQL.

---

## 3. Frontend Standard: Component-Driven & Craftsmanship (React + Vite)

Frontend harus cepat, modular, dan memiliki estetika tinggi:

```text
frontend/
├── src/
│   ├── api/                   # Axios/Fetch API client & endpoint contracts
│   ├── components/
│   │   ├── ui/                # Primitives (Button, Modal, Input, Badge)
│   │   └── common/            # Composite UI (Navbar, Footer, GroupCard)
│   ├── hooks/                 # Custom reusable hooks (useAuth, useGroups, useDebounce)
│   ├── layouts/               # MainLayout, AuthLayout, AdminLayout
│   ├── pages/                 # Route components (Explore, Profile, GroupDetail, Admin)
│   ├── types/ (atau utils/)   # Helper functions, form schemas, constants
│   ├── App.jsx
│   └── main.jsx
```

### Aturan Baku React:
- **Mobile-First & Responsive:** Setiap komponen harus nyaman digunakan di layar 360px (smartphone) hingga 1440px (desktop).
- **Separation of Concerns:** Jangan campur pemanggilan API langsung di dalam event handler JSX. Gunakan service module atau custom hook.
- **Accessible UI:** Gunakan elemen semantik HTML (`<nav>`, `<main>`, `<article>`, `<button>`), sediakan `aria-label` jika ikon berdiri sendiri.
- **Fast Feedback:** Tampilkan feedback instan (toast notification, micro-interaction) saat pengguna melakukan aksi (misal: "Permintaan bergabung terkirim").

---

## 4. Verification & Testing Protocol

Sebelum menyatakan fitur atau task selesai:
1. Pastikan backend Go terkompilasi bersih tanpa peringatan: `go vet ./...` dan lulus uji `go test ./...`.
2. Pastikan build frontend React berhasil tanpa error: `npm run build`.
3. Validasi alur end-to-end secara faktual (input valid, input invalid/edge-cases, otorisasi role yang benar).
