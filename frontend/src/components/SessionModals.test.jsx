// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../context/AuthContext'
import { authApi, groupApi, membershipApi } from '../api/client'
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
  vi.spyOn(groupApi, 'getMessages').mockResolvedValue({ success: true, data: [] })
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

describe('attendance check-in and share link', () => {
  it('lets host mark accepted participant as attended, preserves private access, and copies shareable /sesi/:id URL', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    localStorage.setItem('peerlearn_token', 'host-token')
    vi.spyOn(authApi, 'getMe').mockResolvedValue({
      success: true,
      data: { id: 'host-1', full_name: 'Rani', role: 'student' },
    })
    const acceptedMember = {
      id: 'mem-1',
      group_id: 'session-1',
      user_id: 'student-2',
      status: 'accepted',
      user: { id: 'student-2', full_name: 'Dika Pratama', campus_name: 'UIN SGD - Ilmu Komunikasi' },
    }
    groupApi.getMembers
      .mockResolvedValueOnce({ success: true, data: [acceptedMember] })
      .mockResolvedValueOnce({
        success: true,
        data: [{ ...acceptedMember, status: 'attended' }],
      })
    vi.spyOn(membershipApi, 'updateStatus').mockResolvedValue({ success: true })

    await renderDialog(GroupDetailModal, {
      group: session,
      onActionComplete: vi.fn(),
    })

    const attendBtn = await screen.findByRole('button', { name: 'Tandai Hadir' })
    await user.click(attendBtn)

    expect(membershipApi.updateStatus).toHaveBeenCalledWith('mem-1', 'attended')
    expect(await screen.findByText('Hadir (SKPI)')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Salin tautan sesi' }))
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/sesi/session-1`)
    expect(await screen.findByText('Tersalin')).toBeTruthy()
  })

  it('keeps Ruang Diskusi unlocked for attended participants', async () => {
    const user = userEvent.setup()
    localStorage.setItem('peerlearn_token', 'attended-token')
    vi.spyOn(authApi, 'getMe').mockResolvedValue({
      success: true,
      data: { id: 'student-2', full_name: 'Dika Pratama', role: 'student' },
    })

    await renderDialog(GroupDetailModal, {
      group: { ...session, user_membership: 'attended', status: 'completed' },
      onActionComplete: vi.fn(),
    })

    await user.click(screen.getByRole('button', { name: /Ruang Diskusi/ }))
    expect(screen.queryByText('Ruang Diskusi Tertutup')).toBeNull()
    expect(await screen.findByText(/Belum ada pesan di ruang diskusi sesi ini/)).toBeTruthy()
  })
})
