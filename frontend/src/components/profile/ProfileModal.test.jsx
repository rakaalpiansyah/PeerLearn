// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileModal } from './ProfileModal'
import { AuthProvider } from '../../context/AuthContext'
import { authApi, userApi } from '../../api/client'
import * as compressor from '../../utils/imageCompressor'

const account = { id: 'student-1', full_name: 'Sari', email: 'sari@example.com', role: 'student', campus_name: 'Kampus Lama', bio: 'Belajar bersama' }
const field = (label) => screen.getByLabelText(label)
const change = (label, value) => fireEvent.change(field(label), { target: { value } })
const submit = () => fireEvent.submit(screen.getByRole('dialog').querySelector('form'))

async function mount() {
  const onClose = vi.fn()
  const view = render(<AuthProvider><ProfileModal isOpen onClose={onClose} /></AuthProvider>)
  await waitFor(() => expect(field(/Nama Lengkap/).value).toBe('Sari'))
  return {
    onClose,
    setOpen: (isOpen) => view.rerender(<AuthProvider><ProfileModal isOpen={isOpen} onClose={onClose} /></AuthProvider>),
  }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('peerlearn_token', 'test-token')
  vi.spyOn(authApi, 'getMe').mockResolvedValue({ success: true, data: account })
  vi.spyOn(userApi, 'updateProfile').mockResolvedValue({ success: true, data: account })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('ProfileModal validation', () => {
  it.each(['', '   '])('rejects a blank name (%j), focuses it, and associates an inline error', async (name) => {
    await mount()
    change(/Nama Lengkap/, name)
    submit()
    const input = field(/Nama Lengkap/)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input)
    const description = input.getAttribute('aria-describedby')?.split(/\s+/) || []
    expect(description.length).toBeGreaterThan(0)
    expect(description.some((id) => document.getElementById(id)?.textContent.trim())).toBe(true)
    expect(userApi.updateProfile).not.toHaveBeenCalled()
  })

  it('clears a corrected name error and permits blank optional campus and bio', async () => {
    const { onClose } = await mount()
    change(/Nama Lengkap/, '   ')
    submit()
    expect(field(/Nama Lengkap/).getAttribute('aria-invalid')).toBe('true')
    change(/Nama Lengkap/, '  Sari Baru  ')
    change(/Institusi/, '')
    change(/Deskripsi Singkat/, '')
    expect(field(/Nama Lengkap/).getAttribute('aria-invalid')).not.toBe('true')
    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(userApi.updateProfile).toHaveBeenCalledWith({ full_name: 'Sari Baru', campus_name: '', bio: '' })
  })

  it('clears field errors on reopen and restores the saved profile', async () => {
    const { setOpen } = await mount()
    change(/Nama Lengkap/, '')
    submit()
    expect(field(/Nama Lengkap/).getAttribute('aria-invalid')).toBe('true')
    setOpen(false)
    setOpen(true)
    expect(field(/Nama Lengkap/).value).toBe('Sari')
    expect(field(/Nama Lengkap/).getAttribute('aria-invalid')).not.toBe('true')
  })

  it('announces failure, retains the draft, and permits retry while blocking duplicate requests', async () => {
    let rejectRequest
    userApi.updateProfile.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectRequest = reject }))
    const { onClose } = await mount()
    change(/Nama Lengkap/, 'Nama Baru')
    change(/Institusi/, 'Kampus Baru')
    change(/Deskripsi Singkat/, 'Bio baru')
    submit()
    submit()
    expect(userApi.updateProfile).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Simpan Profil/ }).disabled).toBe(true)
    await act(async () => rejectRequest(new Error('Profil belum tersimpan. Coba lagi.')))
    expect(screen.getByRole('alert').textContent).toContain('Profil belum tersimpan. Coba lagi.')
    expect(field(/Nama Lengkap/).value).toBe('Nama Baru')
    expect(field(/Institusi/).value).toBe('Kampus Baru')
    expect(field(/Deskripsi Singkat/).value).toBe('Bio baru')
    expect(onClose).not.toHaveBeenCalled()
    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(userApi.updateProfile).toHaveBeenCalledTimes(2)
    expect(userApi.updateProfile).toHaveBeenLastCalledWith({ full_name: 'Nama Baru', campus_name: 'Kampus Baru', bio: 'Bio baru' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('updates gender and client-compressed avatar', async () => {
    const { onClose } = await mount()
    fireEvent.change(screen.getByLabelText(/Jenis Kelamin/), { target: { value: 'female' } })
    const file = new File(['fake-pixels'], 'avatar.png', { type: 'image/png' })
    const fileInput = screen.getByLabelText(/Pilih foto profil dari perangkat/)

    vi.spyOn(compressor, 'compressImageFile').mockResolvedValue('data:image/webp;base64,mockCompressedData')

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(userApi.updateProfile).toHaveBeenCalledWith({
      full_name: 'Sari',
      campus_name: 'Kampus Lama',
      bio: 'Belajar bersama',
      gender: 'female',
      avatar_url: 'data:image/webp;base64,mockCompressedData',
    })
  })
})
