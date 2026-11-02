# PeerLearn: Professional Campus Feature Expansion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform PeerLearn into a high-utility campus peer-learning collaboration platform by adding:
1. Custom Skills per Student Profile (Specific university courses & subjects).
2. Exclusive In-Session Discussion & Chat (For Host and Accepted Members).
3. Offline Accurate Geolocation + OpenStreetMap Visual Preview + Google Maps 1-Click Navigation.
4. Structured Syllabus / Agenda Checklist & Session Prerequisites.
5. Verifiable Peer Tutor Contribution Certificate & Summary (for campus SKPI / student portfolios).
6. 1-Click Google Calendar & iCal Integration.

**Architecture:** Go Clean Architecture (Backend) + Component-Driven React 19 (Frontend) + Neon Tech PostgreSQL (Serverless).

**Global Constraints:**
- Zero AI slop, zero em-dashes (`—`) in UI copy.
- Explicit authorization: Group chat and exact private meeting links strictly accessible only by Host and Accepted Members.
- Clean separation: Domain interfaces remain free of SQL/HTTP frameworks.
- Verification before completion: `go test -v ./...`, `go vet ./...`, and `npm run build` must pass cleanly with 0 errors.

---

## Phase 1: Database Schema Migration & Domain Layer

### Task 1.1: Database Schema Expansion
**Files:**
- Create: `backend/internal/database/migrations/000002_campus_features_expansion.sql`
- Modify: `backend/cmd/api/main.go`

- [ ] Add columns to `learning_groups`:
  - `latitude DOUBLE PRECISION DEFAULT NULL`
  - `longitude DOUBLE PRECISION DEFAULT NULL`
  - `building_details VARCHAR(255) DEFAULT ''`
  - `agenda JSONB DEFAULT '[]'::jsonb`
  - `prerequisites TEXT DEFAULT ''`
- [ ] Create table `group_messages`:
  - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
  - `group_id UUID NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE`
  - `sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
  - `message TEXT NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- [ ] Add index on `group_messages(group_id, created_at ASC)`.
- [ ] Ensure migration runs automatically at startup in `main.go`.

### Task 1.2: Domain Structs & DTOs
**Files:**
- Modify: `backend/internal/domain/entity.go`
- Modify: `backend/internal/domain/group_dto.go`
- Create: `backend/internal/domain/message_dto.go`
- Modify: `backend/internal/domain/dto.go`

- [ ] Add `Latitude`, `Longitude`, `BuildingDetails`, `Agenda []string`, and `Prerequisites` to `LearningGroup`, `CreateGroupRequest`, `UpdateGroupRequest`, and `GroupResponse`.
- [ ] Define `GroupMessage` entity and `GroupMessageResponse` / `SendMessageRequest` DTOs.
- [ ] Define `AddCustomSkillRequest` in `dto.go`.

---

## Phase 2: Backend Clean Architecture Implementation & TDD

### Task 2.1: Custom Skills Engine (Dynamic Creation)
**Files:**
- Modify: `backend/internal/repository/skill_repository.go`
- Modify: `backend/internal/service/user_service.go`
- Modify: `backend/internal/handler/user_handler.go`

- [ ] Implement `FindOrCreate(ctx context.Context, name, category string) (*domain.Skill, error)` in `SkillRepository`.
- [ ] Implement `AddCustomSkill(ctx, userID, name, category, skillType)` in `UserService`.
- [ ] Add HTTP endpoint `POST /api/v1/users/skills/custom` in `UserHandler`.

### Task 2.2: Group Chat & Discussion Service (with TDD)
**Files:**
- Create: `backend/internal/repository/message_repository.go`
- Create: `backend/internal/service/message_service.go`
- Create: `backend/internal/service/message_service_test.go`
- Create: `backend/internal/handler/message_handler.go`
- Modify: `backend/cmd/api/main.go`

- [ ] **Test First:** Write unit tests in `message_service_test.go` verifying:
  - Host can post and read messages.
  - Accepted member can post and read messages.
  - Pending user and stranger are rejected with `ErrUnauthorizedAction`.
  - Empty message is rejected with `ErrInvalidInput`.
- [ ] Implement `MessageRepository` (`Create`, `ListByGroup`).
- [ ] Implement `MessageService` with membership guard check.
- [ ] Implement `MessageHandler` and register routes:
  - `GET /api/v1/groups/:id/messages` (JWT Protected)
  - `POST /api/v1/groups/:id/messages` (JWT Protected)

### Task 2.3: Offline Coordinates, Agenda & Prerequisites Validation
**Files:**
- Modify: `backend/internal/repository/group_repository.go`
- Modify: `backend/internal/service/group_service.go`

- [ ] Update `group_repository.go` to scan and insert `latitude`, `longitude`, `building_details`, `agenda`, and `prerequisites`.
- [ ] In `group_service.go`, enforce validation: offline groups require building details; agenda array is sanitized.
- [ ] Run `go test -v ./...` and `go vet ./...` to guarantee 0 errors.

---

## Phase 3: Frontend Component-Driven Implementation

### Task 3.1: API Client Extensions
**Files:**
- Modify: `frontend/src/api/client.js`

- [ ] Add `groupMessageApi.getMessages(groupId)` and `groupMessageApi.sendMessage(groupId, message)`.
- [ ] Add `userApi.addCustomSkill({ name, category, skill_type })`.

### Task 3.2: Custom Skills UI in Profile
**Files:**
- Modify: `frontend/src/components/profile/SkillsModal.jsx`

- [ ] Add an input block: "Tambah Keahlian / Mata Kuliah Spesifik" with category dropdown and Mastered vs Learning selector.
- [ ] Provide instant tag preview and auto-sync with backend.

### Task 3.3: Rich Sessi Details (Agenda, Prerequisites, Maps, Calendar)
**Files:**
- Modify: `frontend/src/components/groups/GroupDetailModal.jsx`
- Modify: `frontend/src/components/groups/CreateGroupModal.jsx`

- [ ] **Create Group:**
  - Add dynamic checklist inputs for "Agenda Pembahasan" (add/remove points).
  - Add textarea for "Prasyarat & Perlengkapan".
  - Add offline fields: Gedung / Ruangan + preset kampus / koordinat GPS.
- [ ] **Group Detail View:**
  - Display Agenda checklist with checkboxes so learners can see the study roadmap.
  - Display "Prasyarat & Perlengkapan" callout box.
  - For offline sessions: show exact building/room instructions, interactive OpenStreetMap visual pin, and a button **"Buka di Google Maps"**.
  - For accepted participants: add a 1-click **"Simpan ke Google Calendar"** button.

### Task 3.4: In-Session Chat & Discussion Tab
**Files:**
- Modify: `frontend/src/components/groups/GroupDetailModal.jsx`

- [ ] Add tab switcher in `GroupDetailModal`: **[ Informasi Sesi ]** vs **[ 💬 Ruang Diskusi Kelompok ]**.
- [ ] Inside discussion tab: render message feed with bubble UI, sender avatar, campus name, and timestamp.
- [ ] Input box with `Enter` to send, loading state, and auto-scroll to latest message.
- [ ] Accessible only to confirmed members and host; show a locked banner for non-members.

### Task 3.5: Verifiable Peer Tutor Contribution Summary (SKPI / Portfolio)
**Files:**
- Create: `frontend/src/components/profile/TutorSummaryModal.jsx`
- Modify: `frontend/src/components/profile/ProfileModal.jsx`
- Modify: `frontend/src/pages/HomePage.jsx`

- [ ] Design an official, printable academic certificate card:
  - Mahasiswa Name, Campus Name, Verified `.ac.id` badge.
  - Total Sesi Terlaksana, Jam Bimbingan, Peserta Terbantu, Rating Rata-rata.
  - Official PeerLearn verification watermark & timestamp.
  - Button **"Cetak / Unduh Bukti Kontribusi (PDF/Print)"**.

---

## Phase 4: Full System Verification & End-to-End Testing

- [ ] Backend: `cd backend && go test -v ./... && go vet ./...` (confirm 100% pass).
- [ ] Frontend: `cd frontend && npm run build` (confirm 0 errors).
- [ ] Multi-user Live Test:
  1. Raka logs in, creates an offline session with agenda, prerequisites, and campus coordinates.
  2. Siti adds custom skill "Next.js 15 App Router", finds Raka's session, and applies.
  3. Raka accepts Siti; Siti clicks "Simpan ke Google Calendar" and opens Google Maps.
  4. Raka and Siti exchange messages in the exclusive Group Discussion room.
  5. Raka views his printable Tutor Contribution Certificate for SKPI.
