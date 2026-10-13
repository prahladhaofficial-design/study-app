import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Card, PageHeader } from '../components/ui'
import { db, newId, type Project } from '../lib/db'
import { PROJECT_COLORS, projectStats } from '../lib/projects'
import { formatDuration } from '../lib/time'

type Draft = { id: string | null; name: string; color: string; targetHours: string; deadline: string }

const emptyDraft = (): Draft => ({ id: null, name: '', color: PROJECT_COLORS[0], targetHours: '20', deadline: '' })

function deadlineText(daysLeft: number | null): string | null {
  if (daysLeft === null) return null
  if (daysLeft <= 0) return 'Deadline passed'
  if (daysLeft === 1) return 'Due today'
  return `${daysLeft} days left`
}

/** Group study time by course or exam. Sessions count when their subject matches the project name. */
export function ProjectsPage() {
  const projects = useLiveQuery(() => db.projects.orderBy('name').toArray(), [], [])
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const now = new Date()

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    const name = draft.name.trim()
    if (!name) return
    const t = Date.now()
    const fields = { name, color: draft.color, targetHours: Math.max(0, parseFloat(draft.targetHours) || 0), deadline: draft.deadline || null, updatedAt: t }
    if (draft.id) await db.projects.update(draft.id, fields)
    else await db.projects.add({ id: newId(), archived: false, createdAt: t, ...fields })
    setDraft(null)
  }

  async function remove(p: Project) {
    if (!window.confirm(`Delete "${p.name}"? Your sessions stay in the log.`)) return
    await db.projects.delete(p.id)
  }

  const visible = projects.filter((p) => p.archived === showArchived)
  const archivedCount = projects.filter((p) => p.archived).length

  return (
    <div className="mx-auto max-w-5xl py-6">
      <PageHeader
        title="Projects"
        subtitle="One project per course or exam. Pick it as the subject on the timer and the hours add up here."
        actions={
          <button type="button" onClick={() => setDraft(emptyDraft())} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
            <Plus size={16} /> New project
          </button>
        }
      />

      {draft && (
        <Card className="mb-6">
          <form onSubmit={(e) => void save(e)} className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
              Name
              <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Organic chemistry" className="rounded-lg border border-line bg-surface-2 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Target hours
              <input type="number" min="0" step="1" value={draft.targetHours} onChange={(e) => setDraft({ ...draft, targetHours: e.target.value })} className="w-28 rounded-lg border border-line bg-surface-2 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Exam or deadline
              <input type="date" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} className="rounded-lg border border-line bg-surface-2 px-3 py-2" />
            </label>
            <div className="flex flex-col gap-1 text-sm">
              Colour
              <div className="flex gap-1.5 py-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    onClick={() => setDraft({ ...draft, color: c })}
                    className={clsx('size-6 rounded-full ring-offset-2 ring-offset-surface', draft.color === c && 'ring-2 ring-ink')}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
                {draft.id ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {visible.length === 0 ? (
        <Card className="py-12 text-center text-dim">{showArchived ? 'No archived projects.' : 'No projects yet. Create one for each subject or exam you are preparing for.'}</Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const st = projectStats(p, sessions, now)
            const due = deadlineText(st.daysLeft)
            return (
              <li key={p.id}>
                <Card className="group flex h-full flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: p.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-xs text-faint">
                        {st.sessions} session{st.sessions === 1 ? '' : 's'}
                        {st.lastStudied && ` · last ${new Date(st.lastStudied).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                      </p>
                    </div>
                    <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        aria-label="Edit project"
                        onClick={() => setDraft({ id: p.id, name: p.name, color: p.color, targetHours: String(p.targetHours), deadline: p.deadline ?? '' })}
                        className="p-1 text-faint hover:text-ink"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={p.archived ? 'Restore project' : 'Archive project'}
                        onClick={() => void db.projects.update(p.id, { archived: !p.archived, updatedAt: Date.now() })}
                        className="p-1 text-faint hover:text-ink"
                      >
                        {p.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                      </button>
                      <button type="button" aria-label="Delete project" onClick={() => void remove(p)} className="p-1 text-faint hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="font-mono text-2xl font-bold">{formatDuration(st.hours * 3_600_000)}</span>
                      {p.targetHours > 0 && <span className="text-sm text-faint">of {p.targetHours}h</span>}
                    </div>
                    {p.targetHours > 0 && (
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full transition-all" style={{ width: `${st.ratio * 100}%`, background: p.color }} />
                      </div>
                    )}
                  </div>

                  {due && (
                    <p className={clsx('mt-auto text-sm', st.daysLeft !== null && st.daysLeft <= 7 ? 'text-warm' : 'text-dim')}>
                      {due}
                      {st.perDayNeeded !== null && st.perDayNeeded > 0 && ` · ${formatDuration(st.perDayNeeded * 3_600_000)} a day to finish`}
                      {st.perDayNeeded === 0 && ' · target reached'}
                    </p>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {(archivedCount > 0 || showArchived) && (
        <button type="button" onClick={() => setShowArchived(!showArchived)} className="mt-6 text-sm text-faint hover:text-ink">
          {showArchived ? 'Back to active projects' : `Show archived (${archivedCount})`}
        </button>
      )}
    </div>
  )
}
