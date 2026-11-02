// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../context/AuthContext'
import { groupApi, membershipApi } from '../api/client'
import { GroupDetailModal } from './groups/GroupDetailModal'
import { MySessionsModal } from './sessions/MySessionsModal'
import { FeedbackModal } from './feedback/FeedbackModal'
import { ReportModal } from './reports/ReportModal'

const session = {
  id: 'session-1',
  title: 'Diskusi Struktur Data',
  category: 'Teknologi',
  description: 'Diskusi pohon dan graf.',
  start_time: '2026-11-02T09:00:00Z',
  end_time: '2026-11-02T10:00:00Z',
  format: 'online',
  location_or_link: 'https://example.com/meeting',
  status: 'open',
  host_id: 'host-1',
  host: { id: 'host-1', full_name: 'Rani', role: 'student', campus_name: 'Kampus', contribution_points: 10 },
  user_membership: 'accepted',
  current_members: 3,
  max_capacity: 5,
}

const dialogs = [
  { Component: GroupDetailModal, name: 'Diskusi Struktur Data', id: 'group-detail-title', props: { group: session } },
  { Component: MySessionsModal, name: 'Sesi Belajar Saya', id: 'my-sessions-title' },
  { Component: FeedbackModal, name: 'Ulasan & Apresiasi Tutor', id: 'feedback-title', props: { groupId: session.id } },
  { Component: ReportModal, name: 'Laporkan Sesi Belajar', id: 'report-title', props: { targetGroupId: session.id } },
]

async function renderDialog(Component, props = {}, onClose = vi.fn()) {
  function Harness() {
    const [isOpen, setIsOpen] = useState(true)
    return (
      <AuthProvider>
        <Component
          {...props}
          isOpen={isOpen}
          onClose={() => {
            onClose()
            setIsOpen(false)
          }}
        />
      </AuthProvider>
    )
  }
  await act(async () => render(<Harness />))
  return onClose
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(groupApi, 'getMembers').mockResolvedValue({ success: true, data: [] })
  vi.spyOn(groupApi, 'getFeedbacks').mockResolvedValue({ success: true, data: [] })
  vi.spyOn(membershipApi, 'getMySessions').mockResolvedValue({
    success: true,
    data: { joined: [session], hosted: [session] },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe.each(dialogs)('$name accessibility', ({ Component, name, id, props }) => {
  it('exposes exactly one open native dialog named by its heading', async () => {
    await renderDialog(Component, props)
    const dialog = screen.getByRole('dialog', { name })
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog.open).toBe(true)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(dialog.getAttribute('aria-labelledby')).toBe(id)
    expect(within(dialog).getByRole('heading', { name, level: 2 }).id).toBe(id)
  })

  it('routes native cancel to the controlled close callback', async () => {
    const onClose = await renderDialog(Component, props)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('offers a named non-submit close button', async () => {
    const user = userEvent.setup()
    const onClose = await renderDialog(Component, props)
    const close = screen.getByRole('button', { name: 'Tutup dialog' })
    expect(close.type).toBe('button')
    await user.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('session selection', () => {
  it.each([
    ['joined', '{Enter}'],
    ['joined', ' '],
    ['hosted', '{Enter}'],
    ['hosted', ' '],
  ])('opens a %s session using the %s key and retains its heading', async (tab, key) => {
    const user = userEvent.setup()
    const onSelectGroup = vi.fn()
    const onClose = await renderDialog(MySessionsModal, { onSelectGroup })
    if (tab === 'hosted') {
      await user.click(screen.getByRole('button', { name: 'Sesi Diselenggarakan (1)' }))
    }
    const row = screen.getByRole('button', { name: 'Lihat sesi Diskusi Struktur Data' })
    expect(row.tagName).toBe('BUTTON')
    expect(row.type).toBe('button')
    expect(screen.getByRole('heading', { name: session.title, level: 3 })).toBeTruthy()
    row.focus()
    await user.keyboard(key)
    expect(onSelectGroup).toHaveBeenCalledExactlyOnceWith(session)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

it('names all five rating choices and announces the current selection after keyboard activation', async () => {
  const user = userEvent.setup()
  await renderDialog(FeedbackModal, { groupId: session.id })
  for (const star of [1, 2, 3, 4, 5]) {
    const choice = screen.getByRole('button', { name: `${star} dari 5 bintang` })
    expect(choice.type).toBe('button')
    expect(choice.getAttribute('aria-pressed')).toBe(star === 5 ? 'true' : 'false')
  }
  screen.getByRole('button', { name: '3 dari 5 bintang' }).focus()
  await user.keyboard(' ')
  expect(screen.getByRole('button', { name: '3 dari 5 bintang' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: '5 dari 5 bintang' }).getAttribute('aria-pressed')).toBe('false')
  expect(screen.getByText('Cukup Memadai ⭐⭐⭐')).toBeTruthy()
})
