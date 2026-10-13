import { describe, expect, it } from 'vitest'
import type { Task } from './db'
import { groupTasks } from './tasks'

const task = (id: string, dueDay: string | null, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  done: false,
  subject: null,
  dueDay,
  createdAt: Number(id.replace(/\D/g, '')) || 0,
  doneAt: null,
  updatedAt: 0,
  ...extra,
})

describe('groupTasks', () => {
  it('buckets by due day and skips finished tasks', () => {
    const g = groupTasks(
      [task('a1', '2026-10-10'), task('b2', '2026-10-13'), task('c3', '2026-10-20'), task('d4', null), task('e5', '2026-10-13', { done: true })],
      '2026-10-13',
    )
    expect(g.overdue.map((t) => t.id)).toEqual(['a1'])
    expect(g.today.map((t) => t.id)).toEqual(['b2'])
    expect(g.upcoming.map((t) => t.id)).toEqual(['c3'])
    expect(g.someday.map((t) => t.id)).toEqual(['d4'])
  })

  it('orders upcoming by soonest due day', () => {
    const g = groupTasks([task('x1', '2026-11-01'), task('y2', '2026-10-15')], '2026-10-13')
    expect(g.upcoming.map((t) => t.id)).toEqual(['y2', 'x1'])
  })
})
