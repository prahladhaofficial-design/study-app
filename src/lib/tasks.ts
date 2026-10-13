import type { Task } from './db'

export type TaskGroup = 'overdue' | 'today' | 'upcoming' | 'someday'

export const GROUP_LABEL: Record<TaskGroup, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  someday: 'Any time',
}

/** Buckets open tasks by due day relative to `today` (a dayKey); each bucket keeps a stable order. */
export function groupTasks(tasks: Task[], today: string): Record<TaskGroup, Task[]> {
  const groups: Record<TaskGroup, Task[]> = { overdue: [], today: [], upcoming: [], someday: [] }
  for (const t of tasks) {
    if (t.done) continue
    if (!t.dueDay) groups.someday.push(t)
    else if (t.dueDay < today) groups.overdue.push(t)
    else if (t.dueDay === today) groups.today.push(t)
    else groups.upcoming.push(t)
  }
  const byDue = (a: Task, b: Task) => (a.dueDay ?? '').localeCompare(b.dueDay ?? '') || a.createdAt - b.createdAt
  groups.overdue.sort(byDue)
  groups.upcoming.sort(byDue)
  groups.today.sort((a, b) => a.createdAt - b.createdAt)
  groups.someday.sort((a, b) => a.createdAt - b.createdAt)
  return groups
}
