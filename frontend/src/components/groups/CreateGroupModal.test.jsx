// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { groupApi } from '../../api/client'
import { CreateGroupModal } from './CreateGroupModal'

function getFutureDateParts(daysAhead = 10) {
  const future = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  return {
    dateStr: `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}`,
    year: future.getFullYear(),
    month: future.getMonth(),
    day: future.getDate(),
  }
}

const futureDate = getFutureDateParts(10)

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

function setup(props = {}) {
  const onClose = vi.fn()
  const onCreated = vi.fn()
  render(<CreateGroupModal isOpen onClose={onClose} onCreated={onCreated} {...props} />)
  return { onClose, onCreated }
}

function fillValid() {
  change('title', 'Diskusi Graph')
  change('location', 'Ruang diskusi daring')
  change('date', futureDate.dateStr)
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
  vi.spyOn(groupApi, 'update').mockResolvedValue({ success: true, data: null })
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
    ['date', '2020-01-02'],
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
      expect([
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        timestamp.getMinutes(),
      ]).toEqual([futureDate.year, futureDate.month, futureDate.day, hour, 0])
    }
  })

  it('accepts valid future offline date and UIN SGD campus location', async () => {
    const { onCreated } = setup()
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: 'Luring' }))
    fireEvent.change(screen.getByLabelText(/Lokasi Fisik/), {
      target: { value: 'Perpustakaan Rachmat Djatnika UIN SGD' },
    })
    change('description', 'Bawa catatan kuliah')
    submit()

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(groupApi.create).toHaveBeenCalledWith(expect.objectContaining({
      format: 'offline',
      location_or_link: 'Perpustakaan Rachmat Djatnika UIN SGD',
      description: 'Bawa catatan kuliah',
    }))
  })

  it('hydrates and updates a rejected session in full edit mode', async () => {
    const rejectedGroup = {
      id: 'grp-rej-1',
      title: 'Judul Awal Kurang Jelas',
      description: 'Deskripsi lama',
      category: 'Ekonomi & Bisnis Islam',
      format: 'offline',
      location_or_link: 'Kampus 2 Cimencrang',
      building_details: 'Ruang 204',
      latitude: -6.9388,
      longitude: 107.698,
      agenda: ['Materi lama'],
      prerequisites: 'Kalkulator',
      start_time: new Date(futureDate.year, futureDate.month, futureDate.day, 9, 0).toISOString(),
      end_time: new Date(futureDate.year, futureDate.month, futureDate.day, 11, 0).toISOString(),
      max_capacity: 10,
      status: 'rejected',
      review_note: 'Perjelas judul sesi dan tambahkan agenda.',
    }

    const { onClose, onCreated } = setup({ editingGroup: rejectedGroup })
    expect(screen.getByRole('heading', { name: 'Perbaiki & Ajukan Ulang Sesi' })).toBeTruthy()
    expect(screen.getByText('Perjelas judul sesi dan tambahkan agenda.')).toBeTruthy()
    expect(field('title').value).toBe('Judul Awal Kurang Jelas')

    change('title', 'Bedah Akuntansi Syariah Lanjut')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan & Ajukan Ulang' }))

    await waitFor(() => expect(groupApi.update).toHaveBeenCalledTimes(1))
    expect(groupApi.update).toHaveBeenCalledWith(
      'grp-rej-1',
      expect.objectContaining({
        title: 'Bedah Akuntansi Syariah Lanjut',
        category: 'Ekonomi & Bisnis Islam',
        format: 'offline',
        location_or_link: 'Kampus 2 Cimencrang',
      })
    )
    expect(groupApi.create).not.toHaveBeenCalled()
    expect(onCreated).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
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
      title: 'Diskusi Graph', location: 'Ruang diskusi daring', date: futureDate.dateStr,
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
