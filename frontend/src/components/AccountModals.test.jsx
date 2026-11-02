// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AuthModal } from './auth/AuthModal'
import { ProfileModal } from './profile/ProfileModal'
import { SkillsModal } from './profile/SkillsModal'
import { CreateGroupModal } from './groups/CreateGroupModal'
import { AuthProvider } from '../context/AuthContext'
import { authApi, userApi } from '../api/client'

const account = {
  id: 'student-1',
  full_name: 'Sari',
  email: 'sari@example.com',
  role: 'student',
  campus_name: 'Kampus Lama',
  bio: 'Belajar bersama',
  skills: [],
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('peerlearn_token', 'test-token')
  vi.spyOn(authApi, 'getMe').mockResolvedValue({ success: true, data: account })
  vi.spyOn(userApi, 'getSkills').mockResolvedValue({ success: true, data: [] })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe.each([
  ['AuthModal', AuthModal, 'Masuk ke PeerLearn'],
  ['ProfileModal', ProfileModal, 'Edit Profil Pengguna'],
  ['SkillsModal', SkillsModal, 'Kelola Minat & Keahlian Belajar'],
  ['CreateGroupModal', CreateGroupModal, 'Buka Sesi Belajar Baru'],
])('%s native modal integration', (_name, Component, title) => {
  async function mount(isOpen = true) {
    const onClose = vi.fn()
    await act(async () => {
      render(
        <AuthProvider>
          <Component isOpen={isOpen} onClose={() => onClose()} />
        </AuthProvider>,
      )
    })
    return onClose
  }

  it('opens one native dialog named by its existing heading', async () => {
    await mount()
    const dialog = screen.getByRole('dialog', { name: title })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog.open).toBe(true)
    const heading = within(dialog).getByRole('heading', { name: title })
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id)
  })

  it('routes native cancel to the controlled close callback', async () => {
    const onClose = await mount()
    const dialog = screen.getByRole('dialog', { name: title })
    const cancel = new Event('cancel', { bubbles: false, cancelable: true })
    fireEvent(dialog, cancel)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(cancel.defaultPrevented).toBe(true)
  })

  it('provides a named non-submit close button', async () => {
    const onClose = await mount()
    const close = within(screen.getByRole('dialog', { name: title }))
      .getByRole('button', { name: 'Tutup dialog' })
    expect(close.getAttribute('type')).toBe('button')
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders no dialog while closed', async () => {
    await mount(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
