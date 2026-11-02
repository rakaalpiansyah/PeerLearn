// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from './AuthModal'
import { AuthProvider } from '../../context/AuthContext'
import { authApi } from '../../api/client'

const account = { id: 'student-1', full_name: 'Sari', email: 'sari@example.com', role: 'student', campus_name: '', bio: '' }
const session = { success: true, data: { token: 'test-token', user: account } }
const field = (label) => screen.getByLabelText(label)
const change = (label, value) => fireEvent.change(field(label), { target: { value } })
const submit = () => fireEvent.submit(screen.getByRole('dialog').querySelector('form'))

function mount(initialMode = 'register') {
  const onClose = vi.fn()
  const view = render(<AuthProvider><AuthModal isOpen initialMode={initialMode} onClose={onClose} /></AuthProvider>)
  return {
    onClose,
    setOpen: (isOpen, mode = initialMode) => view.rerender(
      <AuthProvider><AuthModal isOpen={isOpen} initialMode={mode} onClose={onClose} /></AuthProvider>,
    ),
  }
}

function fillRegistration(password = ' secret ') {
  change(/Nama Lengkap/, '  Sari  ')
  change(/Alamat Email/, 'sari@example.com')
  change(/Kata Sandi/, password)
}

function expectFieldError(control) {
  expect(control.getAttribute('aria-invalid')).toBe('true')
  const ids = control.getAttribute('aria-describedby')?.split(/\s+/) || []
  expect(ids.length).toBeGreaterThan(0)
  expect(ids.some((id) => document.getElementById(id)?.textContent.trim())).toBe(true)
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(authApi, 'login').mockResolvedValue(session)
  vi.spyOn(authApi, 'register').mockResolvedValue(session)
  vi.spyOn(authApi, 'getMe').mockResolvedValue({ success: true, data: account })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('AuthModal validation', () => {
  it('blocks empty signup, describes each field error, and focuses the first invalid field', () => {
    mount()
    submit()
    for (const label of [/Nama Lengkap/, /Alamat Email/, /Kata Sandi/]) expectFieldError(field(label))
    expect(document.activeElement).toBe(field(/Nama Lengkap/))
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it.each([
    ['whitespace name', /Nama Lengkap/, '   '],
    ['malformed email', /Alamat Email/, 'not-an-email'],
    ['short signup password', /Kata Sandi/, '12345'],
    ['empty password', /Kata Sandi/, ''],
  ])('rejects %s before requesting an account', (_case, label, value) => {
    mount()
    fillRegistration()
    change(label, value)
    submit()
    expectFieldError(field(label))
    expect(document.activeElement).toBe(field(label))
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('explains the signup minimum visibly and submits corrected values with an unchanged password', async () => {
    const { onClose } = mount()
    expect(screen.getByText(/minimal 6 karakter/i)).toBeTruthy()
    submit()
    fillRegistration()
    expect(field(/Nama Lengkap/).getAttribute('aria-invalid')).not.toBe('true')
    expect(field(/Alamat Email/).getAttribute('aria-invalid')).not.toBe('true')
    expect(field(/Kata Sandi/).getAttribute('aria-invalid')).not.toBe('true')
    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(authApi.register).toHaveBeenCalledWith({
      full_name: 'Sari', email: 'sari@example.com', password: ' secret ', role: 'student', campus_name: '',
    })
  })

  it('accepts an existing short login password unchanged without requiring signup fields', async () => {
    const { onClose } = mount('login')
    change(/Alamat Email/, ' sari@example.com ')
    change(/Kata Sandi/, ' x ')
    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(authApi.login).toHaveBeenCalledWith({ email: 'sari@example.com', password: ' x ' })
    expect(authApi.register).not.toHaveBeenCalled()
    expect(screen.queryByText(/minimal 6 karakter/i)).toBeNull()
  })

  it('clears signup errors on mode changes and validates only the current mode', async () => {
    const user = userEvent.setup()
    const { onClose } = mount()
    submit()
    expectFieldError(field(/Nama Lengkap/))
    await user.click(screen.getByRole('button', { name: 'Masuk', exact: true }))
    expect(field(/Alamat Email/).getAttribute('aria-invalid')).not.toBe('true')
    expect(field(/Kata Sandi/).getAttribute('aria-invalid')).not.toBe('true')
    change(/Alamat Email/, 'sari@example.com')
    change(/Kata Sandi/, '123')
    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'Daftar', exact: true }))
    expect(field(/Nama Lengkap/).getAttribute('aria-invalid')).not.toBe('true')
    submit()
    expectFieldError(field(/Nama Lengkap/))
    expectFieldError(field(/Kata Sandi/))
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('clears field errors when reopened or when the requested mode changes', () => {
    const { setOpen } = mount()
    submit()
    expectFieldError(field(/Nama Lengkap/))
    setOpen(false)
    setOpen(true)
    expect(field(/Nama Lengkap/).getAttribute('aria-invalid')).not.toBe('true')
    submit()
    setOpen(true, 'login')
    expect(field(/Alamat Email/).getAttribute('aria-invalid')).not.toBe('true')
    expect(screen.queryByLabelText(/Nama Lengkap/)).toBeNull()
  })

  it('announces request failure, retains the signup draft, and allows retry without duplicates while loading', async () => {
    let rejectRequest
    authApi.register.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectRequest = reject }))
    const { onClose } = mount()
    fillRegistration()
    change(/Nama Kampus/, 'Kampus Sari')
    submit()
    submit()
    expect(authApi.register).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Daftar Sekarang/ }).disabled).toBe(true)
    await act(async () => rejectRequest(new Error('Jaringan terputus. Coba lagi.')))
    expect(screen.getByRole('alert').textContent).toContain('Jaringan terputus. Coba lagi.')
    expect(field(/Nama Lengkap/).value).toBe('  Sari  ')
    expect(field(/Nama Kampus/).value).toBe('Kampus Sari')
    expect(field(/Alamat Email/).value).toBe('sari@example.com')
    expect(field(/Kata Sandi/).value).toBe(' secret ')
    expect(onClose).not.toHaveBeenCalled()
    submit()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(authApi.register).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
