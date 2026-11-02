# Modal Accessibility Implementation Plan

**Goal:** Make all eight dialogs operable with keyboard and maintain correct focus, stacking, and background isolation without redesign or business-rule changes.

**Architecture:** A shared Modal component delegates native modal behavior to HTMLDialogElement.showModal(). Native top-layer stacking makes dialogs opened later appear above earlier dialogs regardless of JSX order. Existing panels remain children with their classes unchanged. React handles cancel as a controlled close and a shared lifecycle manages document scroll lock and focus fallback.

**Constraints:** No new dependencies, commits, backend behavior changes, backdrop-click dismissal, or wholesale visual redesign. Supported browsers must implement native dialog (current Chrome/Edge/Firefox/Safari). Test-only jsdom shim implements only open/close API, not native focus trapping or inertness; those require actual browser verification.

## Interface
`Modal({ isOpen, onClose, labelledBy, children })` in frontend/src/components/ui/Modal.jsx:
- Mount/open with showModal, initial focus inside (first enabled button or panel fallback).
- Native dialog has accessible name via aria-labelledby. Child panel must not retain another role=dialog/aria-modal.
- Native cancel (Escape) prevents uncontrolled closing and invokes onClose.
- Close/unmount closes native dialog, restores focus to connected opener when appropriate, or logical remaining-dialog/main fallback when opener disappears.
- Body overflow remains locked until the last modal closes; original inline value is restored.
- No effects restarted just because an inline onClose callback changes.

## Tasks
- [ ] Write failing shared lifecycle tests; implement Modal and narrow jsdom API shim in test setup through Vite test.setupFiles.
- [ ] Migrate AuthModal, ProfileModal, CreateGroupModal, SkillsModal to shared Modal; retain validation/drafts; named44px close controls.
- [ ] Migrate GroupDetailModal, MySessionsModal, FeedbackModal, ReportModal; add missing accessible heading/close names and label rating controls. Make session rows keyboard-operable semantic buttons.
- [ ] Test real App nested flows: detail→login (earlier JSX), detail→report/feedback, session-list→detail; Escape dismisses upper only and closing returns focus appropriately.
- [ ] Verify native keyboard containment/background inertness/scroll locking/stacking in production-build browser at360/768/1440; run full frontend suite/build/lint and Go test/vet; independent review.

## Review focus
- StrictMode setup/cleanup and callback rerenders do not reset focus or leak scroll lock.
- Closing lower dialog during replacement cannot steal focus from newer top dialog.
- Removed opener from refreshed lists does not leave focus behind a remaining dialog.
- Single Escape closes only the top dialog; opening login from detail must not render behind detail.
- Existing functional tests remain meaningful; jsdom shim is not evidence of native focus or inert behavior.
