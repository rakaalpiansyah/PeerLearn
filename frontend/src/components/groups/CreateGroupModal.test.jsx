// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { groupApi } from '../../api/client'
import { CreateGroupModal } from './CreateGroupModal'

const labels = {
  title: /Topik \/ Judul Sesi Belajar/,
  location: /Tautan Pertemuan Daring/,
  date: /Tanggal/,
  start: /Mulai/,
  end: /Selesai/,
  capacity: /Kapasitas Maksimal Peserta/,
  description: /Rincian Pembahasan/,
}

function field(name) {
  return screen.getByLabelText(labels[name])
}

function change(name, value) {
  fireEvent.change(field(name), { target: { value } })
}

function setup() {
  const onClose = vi.fn()
  const onCreated = vi.fn()
  render(<CreateGroupModal isOpen onClose={onClose} onCreated={onCreated} />)
  return { onClose, onCreated }
}

function fillValid() {
  change('title', 'Diskusi Graph')
  change('location', 'Ruang diskusi daring')
  change('date', '2026-11-02')
  change('start', '14:00')
  change('end', '16:00')
  change('capacity', '5')
}

function submit() {
  fireEvent.submit(field('title').form)
}

function expectInlineError(control) {
  expect(control.getAttribute('aria-invalid')).toBe('true')
  const descriptions = control.getAttribute('aria-describedby')?.split(/\s+/) || []
  expect(descriptions.some((id) => document.getElementById(id)?.textContent.trim())).toBe(true)
}

beforeEach(() => {
  vi.spyOn(groupApi, 'create').mockResolvedValue({ success: true, data: { id: 'group-1' } })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('CreateGroupModal validation', () => {
  it('shows required errors inline, focuses the first field, and sends no empty form', async () => {
    setup()
    submit()

    expect(groupApi.create).not.toHaveBeenCalled()
    for (const name of ['title', 'location', 'date']) expectInlineError(field(name))
    expect(document.activeElement).toBe(field('title'))
    expect(field('title').form.noValidate).toBe(true)
    expect(screen.getByRole('button', { name: /Publikasikan/ }).disabled).toBe(false)
  })

  it.each([
    ['title', ''],
    ['title', '   '],
    ['location', ''],
    ['location', '   '],
    ['date', ''],
    ['start', ''],
    ['end', ''],
    ['end', '14:00'],
    ['end', '13:59'],
    ['capacity', ''],
    ['capacity', '1'],
    ['capacity', '51'],
    ['capacity', '2.5'],
  ])('blocks invalid %s value %j before creating a session', async (name, value) => {
    setup()
    fillValid()
    change(name, value)
    submit()

    expect(groupApi.create).not.toHaveBeenCalled()
    expectInlineError(field(name))
    expect(document.activeElement).toBe(field(name))
    expect(screen.getByRole('button', { name: /Publikasikan/ }).disabled).toBe(false)
  })

  it('clears only the edited field error and allows a corrected schedule', async () => {
    setup()
    fillValid()
    change('title', '   ')
    change('end', '14:00')
    submit()
    expectInlineError(field('title'))
    expectInlineError(field('end'))

    change('title', 'Diskusi Graph')
    expect(field('title').getAttribute('aria-invalid')).not.toBe('true')
    expectInlineError(field('end'))
    change('end', '16:00')
    expect(field('end').getAttribute('aria-invalid')).not.toBe('true')
    submit()
    await waitFor(() => expect(groupApi.create).toHaveBeenCalledTimes(1))
  })

  it.each([2, 50])('accepts capacity %i with optional description and local dates serialized to UTC', async (capacity) => {
    const { onClose, onCreated } = setup()
    fillValid()
    change('capacity', String(capacity))
    submit()

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'group-1' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(groupApi.create).toHaveBeenCalledTimes(1)
    const payload = groupApi.create.mock.calls[0][0]
    expect(payload).toMatchObject({
      title: 'Diskusi Graph', description: '', category: 'Teknologi', format: 'online',
      location_or_link: 'Ruang diskusi daring', max_capacity: capacity,
    })
    for (const [key, hour] of [['start_time', 14], ['end_time', 16]]) {
      expect(payload[key]).toMatch(/Z$/)
      const timestamp = new Date(payload[key])
      expect([timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), timestamp.getHours(), timestamp.getMinutes()])
        .toEqual([2026, 10, 2, hour, 0])
    }
    if (process.env.TZ === 'UTC') {
      expect(payload.start_time).toBe('2026-11-02T14:00:00.000Z')
      expect(payload.end_time).toBe('2026-11-02T16:00:00.000Z')
    } else if (process.env.TZ === 'Asia/Jakarta') {
      expect(payload.start_time).toBe('2026-11-02T07:00:00.000Z')
      expect(payload.end_time).toBe('2026-11-02T09:00:00.000Z')
    }
  })

  it('accepts past dates and offline location text without adding new restrictions', async () => {
    const { onCreated } = setup()
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: 'Luring' }))
    fireEvent.change(screen.getByLabelText(/Lokasi Fisik/), { target: { value: 'Perpustakaan Lt. 2' } })
    change('date', '2020-01-02')
    change('description', 'Bawa catatan kuliah')
    submit()

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(groupApi.create).toHaveBeenCalledWith(expect.objectContaining({
      format: 'offline', location_or_link: 'Perpustakaan Lt. 2', description: 'Bawa catatan kuliah',
    }))
  })

  it.each(['reject', 'unsuccessful'])('announces a %s request, preserves the draft, and permits retry', async (failure) => {
    if (failure === 'reject') groupApi.create.mockRejectedValueOnce(new Error('Koneksi terputus, coba lagi'))
    else groupApi.create.mockResolvedValueOnce({ success: false, message: 'Sesi belum tersimpan, coba lagi' })
    const { onClose, onCreated } = setup()
    fillValid()
    change('description', 'Bawa catatan kuliah')
    submit()

    expect((await screen.findByRole('alert')).textContent).toMatch(/coba lagi/)
    expect(onClose).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
    for (const [name, value] of Object.entries({
      title: 'Diskusi Graph', location: 'Ruang diskusi daring', date: '2026-11-02',
      start: '14:00', end: '16:00', capacity: '5', description: 'Bawa catatan kuliah',
    })) expect(field(name).value).toBe(value)
    expect(screen.getByRole('button', { name: /Publikasikan/ }).disabled).toBe(false)
    submit()
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(groupApi.create).toHaveBeenCalledTimes(2)
    expect(groupApi.create.mock.calls[1][0]).toEqual(groupApi.create.mock.calls[0][0])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('disables publish and ignores duplicate submissions while the request is pending', async () => {
    let resolveRequest
    groupApi.create.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve }))
    const { onCreated } = setup()
    fillValid()
    const form = field('title').form
    act(() => {
      fireEvent.submit(form)
      fireEvent.submit(form)
    })
    expect(screen.getByRole('button', { name: /Publikasikan/ }).disabled).toBe(true)
    fireEvent.submit(form)
    expect(groupApi.create).toHaveBeenCalledTimes(1)

    await act(async () => resolveRequest({ success: true, data: { id: 'group-1' } }))
    expect(onCreated).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Publikasikan/ }).disabled).toBe(false)
  })
})
