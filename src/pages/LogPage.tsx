import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SessionDialog, type SessionDraft } from '../components/SessionDialog'
import { Card, PageHeader, Segmented } from '../components/ui'
import { db, deleteSession, updateSession, type StudySession } from '../lib/db'
import { dayKey, formatDuration } from '../lib/time'

type Range = 'all' | 'week' | 'month' | 'year'
type Sort = 'newest' | 'oldest' | 'longest' | 'shortest'

function rangeStart(range: Range, now: Date): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  else if (range === 'month') d.setDate(1)
  else if (range === 'year') d.setMonth(0, 1)
  else return 0
  return d.getTime()
}

const SORTERS: Record<Sort, (a: StudySession, b: StudySession) => number> = {
  newest: (a, b) => b.startedAt - a.startedAt,
  oldest: (a, b) => a.startedAt - b.startedAt,
  longest: (a, b) => b.durationMs - a.durationMs,
  shortest: (a, b) => a.durationMs - b.durationMs,
}

const MODE_LABEL: Record<StudySession['mode'], string> = { stopwatch: 'Stopwatch', countdown: 'Countdown', pomodoro: 'Pomodoro' }

export function LogPage() {
  const all = useLiveQuery(() => db.sessions.toArray(), [], [])
  const [range, setRange] = useState<Range>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [editing, setEditing] = useState<StudySession | 'new' | null>(null)

  const subjects = useMemo(() => [...new Set(all.map((s) => s.subject).filter((s): s is string => !!s))].sort(), [all])

  const visible = useMemo(() => {
    const from = rangeStart(range, new Date())
    return all.filter((s) => s.startedAt >= from).sort(SORTERS[sort])
  }, [all, range, sort])

  const totalMs = visible.reduce((n, s) => n + s.durationMs, 0)

  async function save(draft: SessionDraft) {
    const durationMs = draft.durationMin * 60_000
    if (editing === 'new') {
      await db.sessions.add({
        id: crypto.randomUUID(),
        startedAt: draft.startedAt,
        endedAt: draft.startedAt + durationMs,
        durationMs,
        mode: 'stopwatch',
        subject: draft.subject || null,
        notes: draft.notes,
        updatedAt: Date.now(),
      })
    } else if (editing) {
      await updateSession(editing.id, { subject: draft.subject || null, notes: draft.notes, startedAt: draft.startedAt, durationMs })
    }
    setEditing(null)
  }

  async function remove(s: StudySession) {
    if (window.confirm('Delete this session? This cannot be undone.')) await deleteSession(s.id)
  }

  let lastDay = ''

  return (
    <div className="mx-auto max-w-3xl py-6">
      <PageHeader
        title="Log"
        subtitle={`${formatDuration(totalMs)} across ${visible.length} ${visible.length === 1 ? 'session' : 'sessions'}`}
        actions={
          <button type="button" onClick={() => setEditing('new')} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
            <Plus size={16} /> Add session
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Segmented<Range>
          label="Time range"
          value={range}
          onChange={setRange}
          options={[
            { value: 'all', label: 'All' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' },
          ]}
        />
        <select aria-label="Sort sessions" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="longest">Longest first</option>
          <option value="shortest">Shortest first</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <Card className="py-12 text-center text-dim">No sessions here yet. Finish a timer or add one by hand.</Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((s) => {
            const d = new Date(s.startedAt)
            const k = dayKey(d)
            const showDay = (sort === 'newest' || sort === 'oldest') && k !== lastDay
            lastDay = k
            return (
              <li key={s.id}>
                {showDay && (
                  <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-faint first:mt-0">
                    {d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                <div className="group flex items-start gap-4 rounded-xl border border-line bg-surface p-4">
                  <div className="w-20 shrink-0">
                    <p className="font-mono text-lg font-bold">{formatDuration(s.durationMs)}</p>
                    <p className="text-xs text-faint">{d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.subject || 'Untitled session'}</span>
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-dim">{MODE_LABEL[s.mode]}</span>
                    </div>
                    {s.notes && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-dim">{s.notes}</p>}
                  </div>
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                    <button type="button" aria-label="Edit session" onClick={() => setEditing(s)} className="grid size-8 place-items-center rounded-lg text-dim hover:bg-surface-2 hover:text-ink">
                      <Pencil size={15} />
                    </button>
                    <button type="button" aria-label="Delete session" onClick={() => void remove(s)} className="grid size-8 place-items-center rounded-lg text-dim hover:bg-surface-2 hover:text-danger">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && <SessionDialog session={editing === 'new' ? null : editing} subjects={subjects} onSave={(d) => void save(d)} onClose={() => setEditing(null)} />}
    </div>
  )
}
