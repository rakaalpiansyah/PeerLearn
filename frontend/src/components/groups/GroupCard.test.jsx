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

it('renders recommendation match score and explanation badges when present', () => {
  render(
    <GroupCard
      group={{
        ...group,
        match_score: 85,
        match_reason: 'Cocok target belajar: Basis Data',
        match_reasons: [
          'Cocok target belajar: Basis Data',
          'Sesuai rumpun prodi kamu',
        ],
      }}
      onClick={vi.fn()}
    />,
  )

  expect(screen.getByText('85% cocok')).toBeTruthy()
  expect(screen.getByText('Cocok target belajar: Basis Data')).toBeTruthy()
  expect(screen.getByText('Sesuai rumpun prodi kamu')).toBeTruthy()
})

it('renders Co-Tutor badge when session has co-hosts', () => {
  render(
    <GroupCard
      group={{
        ...group,
        host: { id: 'h1', full_name: 'Nabila Azzahra', contribution_points: 20 },
        co_hosts: [
          { user_id: 'c1', user: { id: 'c1', full_name: 'Fajar Ramadhan' } },
          { user_id: 'c2', user: { id: 'c2', full_name: 'Raka' } },
        ],
      }}
      onClick={vi.fn()}
    />,
  )

  expect(screen.getByText('+2 Co-Tutor')).toBeTruthy()
})
