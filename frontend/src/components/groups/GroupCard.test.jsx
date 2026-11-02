// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupCard } from './GroupCard'

afterEach(cleanup)
const group = { id:'group', title:'Diskusi Graph', start_time:'2026-11-02T09:00:00Z', end_time:'2026-11-02T10:00:00Z', max_capacity:5, current_members:2, format:'online', category:'Teknologi' }

it.each(['{Enter}', ' '])('opens a catalog session with %s and keeps its heading', async key => {
  const onClick = vi.fn()
  const user = userEvent.setup()
  render(<GroupCard group={group} onClick={onClick} />)
  const launcher = screen.getByRole('button', { name:'Lihat sesi Diskusi Graph' })
  expect(screen.getByRole('heading', { name:group.title })).toBeTruthy()
  launcher.focus()
  await user.keyboard(key)
  expect(onClick).toHaveBeenCalledTimes(1)
})
