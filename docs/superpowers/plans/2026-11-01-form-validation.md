# Form Validation Implementation Plan

> **For agentic workers:** Use TDD; implementation is authorized inline by the user's request to continue autonomously. Do not commit or create branches.

**Goal:** Give actionable inline validation for account, profile, and session forms without losing drafts on API failure.

**Architecture:** Restore native constraint attributes in Input, attach accessible error/help descriptions with stable React IDs, and use one small hook to translate form constraints into Indonesian field errors. Forms use noValidate to avoid duplicate browser popovers and explicitly validate before API calls. Retain the existing visual identity.

**Tech Stack:** Existing React, native HTML validity, Vitest/Testing Library; no new dependencies.

## Scope and constraints

- Forms: AuthModal (login/register), ProfileModal, CreateGroupModal.
- Required means nonempty after trimming for ordinary text, but passwords are never trimmed.
- Registration password minimum is 6 characters; login must not apply registration's minimum.
- Campus, bio, session description stay optional. No new past-date rule or arbitrary content limits.
- Session capacity: required integer 2–50 as the incumbent UI specifies. End time must be after start time.
- This change improves client feedback, not backend authorization or server-side validation; backend business-rule hardening remains separate.
- No redesign, database writes, commits, or deployment.

## Shared interface

`useFormValidation()` in `frontend/src/hooks/useFormValidation.js` returns:

- `errors`: map keyed by control.name || control.id.
- `validate(form, additionalErrors = {})`: boolean; collect required/type/minLength/range/step errors and custom errors, update state, focus first invalid control in DOM order.
- `clearError(event)`: clear the edited control's field error; attach onChangeCapture to form.
- `clearErrors()`: reset field errors for mode/open transitions.
  `Input` forwards required, merges caller aria-describedby with visible error/help IDs, and sets aria-invalid on error.

## Review focus

- Login with an existing short password is not blocked by signup-only rules.
- Whitespace-only names and session titles are rejected; passwords are sent unchanged.
- Failed requests preserve values and leave the form available for retry.
- Optional fields do not become required; validation follows controls present in the current mode.
- Empty/fractional capacity never silently falls back or truncates.

## Tasks

- [x] Write and observe failing Input regression tests, then forward required and implement stable accessible descriptions.
- [x] Write hook behavior tests for required/whitespace/email/length/numeric constraints, focus and error clearing; implement hook.
- [x] Account/profile slice: failing component tests, integrate hook, valid payloads and error announcements; preserve inputs and scope mode transitions.
- [x] Session slice: failing component tests, integrate hook, inline schedule/capacity errors; preserve drafts and optional fields.
- [x] Review changes independently; resolve confirmed findings with regression tests.
- [x] Run full frontend tests/build, scoped lint, backend tests/vet, and production-build browser checks at mobile/tablet/desktop widths using mocked APIs.

## Verification evidence

- Input/hook RED: 17 failures and 4 passes before implementation; account/profile RED: 14 failures; session RED: 18 failures.
- Final frontend suite: 127 tests passed across 11 files; production build passed.
- Session tests passed with TZ=UTC and TZ=Asia/Jakarta.
- Scoped Oxlint: 0 errors, 5 warnings (existing state-in-effect and unused icons).
- Backend: go test ./... -count=1 and go vet ./... passed.
- Production build in Chromium at 360, 768, 1440px: required/short-password/time/capacity invalid cases block API requests, first invalid focus and aria descriptions verified, HTTP503 preserves drafts, successful retry closes forms. Submit buttons reached by scrolling and activated with emulated touch/mouse input. No horizontal overflow or uncaught browser exceptions in checked flows.
- APIs were intercepted with local fixtures; no real database writes, physical mobile device testing, or screen-reader speech verification. Screenshots: frontend/.taste-skill/form-validation/.
