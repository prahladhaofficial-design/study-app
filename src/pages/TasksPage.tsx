import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calendar, Check, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Card, PageHeader } from '../components/ui'
import { db, newId, type Task } from '../lib/db'
import { GROUP_LABEL, groupTasks, type TaskGroup } from '../lib/tasks'
import { dayKey } from '../lib/time'

const ORDER: TaskGroup[] = ['overdue', 'today', 'upcoming', 'someday']

function dueLabel(day: string, today: string): string {
  if (day === today) return 'Today'
  const d = new Date(`${day}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function TasksPage() {
  const tasks = useLiveQuery(() => db.tasks.orderBy('createdAt').toArray(), [], [])
  const [title, setTitle] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [showDone, setShowDone] = useState(false)
  const today = dayKey(new Date())
  const groups = groupTasks(tasks, today)
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
  const doneToday = done.filter((t) => t.doneAt && dayKey(new Date(t.doneAt)) === today).length

  async function add(e: FormEvent) {
    e.preventDefault()
    const text = title.trim()
    if (!text) return
    const now = Date.now()
    await db.tasks.add({ id: newId(), title: text, done: false, subject: null, dueDay: dueDay || null, createdAt: now, doneAt: null, updatedAt: now })
    setTitle('')
  }

  async function toggle(t: Task) {
    const now = Date.now()
    await db.tasks.update(t.id, { done: !t.done, doneAt: t.done ? null : now, updatedAt: now })
  }

  async function clearDone() {
    if (!window.confirm(`Delete ${done.length} finished task${done.length === 1 ? '' : 's'}?`)) return
    await db.tasks.bulkDelete(done.map((t) => t.id))
  }

  const open = tasks.length - done.length

  return (
    <div className="mx-auto max-w-3xl py-6">
      <PageHeader title="Tasks" subtitle={open ? `${open} to do · ${doneToday} done today` : 'Plan what you will study, then tick it off.'} />

      <form onSubmit={(e) => void add(e)} className="mb-6 flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task, e.g. Finish chapter 4 problems"
          aria-label="New task"
          className="min-w-48 flex-1 rounded-xl border border-line bg-surface px-4 py-3"
        />
        <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-dim">
          <Calendar size={14} />
          <input type="date" value={dueDay} onChange={(e) => setDueDay(e.target.value)} aria-label="Due date" className="bg-transparent py-2 text-ink" />
        </label>
        <button type="submit" className="flex items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">
          <Plus size={16} /> Add
        </button>
      </form>

      {open === 0 && done.length === 0 && <Card className="py-12 text-center text-dim">Nothing here yet. Add your first task above.</Card>}

      <div className="flex flex-col gap-6">
        {ORDER.filter((g) => groups[g].length > 0).map((g) => (
          <section key={g}>
            <h2 className={clsx('mb-2 text-xs font-semibold uppercase tracking-wider', g === 'overdue' ? 'text-danger' : 'text-faint')}>
              {GROUP_LABEL[g]} · {groups[g].length}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {groups[g].map((t) => (
                <TaskRow key={t.id} task={t} today={today} onToggle={() => void toggle(t)} />
              ))}
            </ul>
          </section>
        ))}

        {done.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setShowDone(!showDone)} className="text-xs font-semibold uppercase tracking-wider text-faint hover:text-ink">
                {showDone ? 'Hide' : 'Show'} finished · {done.length}
              </button>
              {showDone && (
                <button type="button" onClick={() => void clearDone()} className="text-xs text-faint hover:text-danger">
                  Clear finished
                </button>
              )}
            </div>
            {showDone && (
              <ul className="flex flex-col gap-1.5">
                {done.slice(0, 50).map((t) => (
                  <TaskRow key={t.id} task={t} today={today} onToggle={() => void toggle(t)} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function TaskRow({ task, today, onToggle }: { task: Task; today: string; onToggle: () => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(task.title)

  async function save() {
    setEditing(false)
    const value = text.trim()
    if (value && value !== task.title) await db.tasks.update(task.id, { title: value, updatedAt: Date.now() })
    else setText(task.title)
  }

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
        onClick={onToggle}
        className={clsx('grid size-5 shrink-0 place-items-center rounded-md border', task.done ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:border-accent')}
      >
        {task.done && <Check size={13} strokeWidth={3} />}
      </button>
      {editing ? (
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
            if (e.key === 'Escape') {
              setText(task.title)
              setEditing(false)
            }
          }}
          aria-label="Task title"
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      ) : (
        <button type="button" onDoubleClick={() => !task.done && setEditing(true)} className={clsx('min-w-0 flex-1 truncate text-left', task.done && 'text-faint line-through')}>
          {task.title}
        </button>
      )}
      {task.dueDay && task.dueDay !== today && !task.done && <span className={clsx('shrink-0 text-xs', task.dueDay < today ? 'text-danger' : 'text-faint')}>{dueLabel(task.dueDay, today)}</span>}
      <button type="button" aria-label="Delete task" onClick={() => void db.tasks.delete(task.id)} className="shrink-0 p-1 text-faint opacity-0 hover:text-danger group-hover:opacity-100 focus:opacity-100">
        <Trash2 size={14} />
      </button>
    </li>
  )
}
