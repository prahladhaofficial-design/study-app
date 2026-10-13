import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card, PageHeader } from '../../components/ui'
import { jargon, terms } from '../../lib/compare'
import { db, newId, type Explanation } from '../../lib/db'

const PROMPTS = [
  'Explain it to a curious 12-year-old.',
  'Use one everyday analogy.',
  'Where did you hesitate or reach for notes? Those are your gaps.',
]

/** Teach a topic in plain words; long words and hesitations reveal what you don't yet understand. */
export function ExplainPage() {
  const list = useLiveQuery(() => db.explanations.orderBy('updatedAt').reverse().toArray(), [], [])
  const [current, setCurrent] = useState<Explanation | null>(null)
  const [dirty, setDirty] = useState(false)

  // Autosave edits shortly after typing stops; merely opening a topic doesn't save.
  useEffect(() => {
    if (!current || !dirty) return
    const id = window.setTimeout(() => {
      void db.explanations.put({ ...current, updatedAt: Date.now() })
      setDirty(false)
    }, 600)
    return () => window.clearTimeout(id)
  }, [current, dirty])

  function edit(patch: Partial<Explanation>) {
    if (!current) return
    setCurrent({ ...current, ...patch })
    setDirty(true)
  }

  const flagged = useMemo(() => (current ? jargon(current.text) : []), [current])
  const wordCount = current ? terms(current.text).length : 0

  function create() {
    const now = Date.now()
    setCurrent({ id: newId(), topic: '', text: '', gaps: '', createdAt: now, updatedAt: now })
    setDirty(true)
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this explanation?')) return
    await db.explanations.delete(id)
    if (current?.id === id) setCurrent(null)
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <PageHeader
        title="Explain it"
        subtitle="If you can explain it simply, you understand it. If you can't, you've found what to study next."
        actions={
          <button type="button" onClick={create} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
            <Plus size={16} /> New topic
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
        <Card className="h-fit p-3">
          {list.length === 0 && !current ? (
            <p className="p-2 text-sm text-faint">No topics yet.</p>
          ) : (
            <ul className="flex flex-col gap-0.5 text-sm">
              {list.map((e) => (
                <li key={e.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrent(e)
                      setDirty(false)
                    }}
                    className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left ${current?.id === e.id ? 'bg-surface-2 text-ink' : 'text-dim hover:text-ink'}`}
                  >
                    {e.topic || 'Untitled'}
                  </button>
                  <button type="button" aria-label="Delete" onClick={() => void remove(e.id)} className="p-1 text-faint opacity-0 hover:text-danger group-hover:opacity-100">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {!current ? (
          <Card className="flex flex-col gap-2 py-12 text-center text-dim">
            <p>Pick a topic or start a new one.</p>
            <ul className="mx-auto mt-2 flex max-w-sm flex-col gap-1 text-left text-sm text-faint">
              {PROMPTS.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              value={current.topic}
              onChange={(e) => edit({ topic: e.target.value })}
              placeholder="Topic, e.g. How vaccines work"
              aria-label="Topic"
              className="rounded-xl border border-line bg-surface px-4 py-3 text-lg font-medium"
            />
            <textarea
              rows={12}
              value={current.text}
              onChange={(e) => edit({ text: e.target.value })}
              placeholder="Explain it in plain words, as if teaching a friend who has never heard of it."
              aria-label="Your explanation"
              className="resize-y rounded-2xl border border-line bg-surface p-4 leading-relaxed"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
              <span>{wordCount} meaningful words</span>
              {flagged.length > 0 && (
                <>
                  <span>· Could you say these more simply?</span>
                  {flagged.map((w) => (
                    <span key={w} className="rounded-full border border-warm/50 px-2 py-0.5 text-warm">
                      {w}
                    </span>
                  ))}
                </>
              )}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Gaps to review
              <textarea
                rows={4}
                value={current.gaps}
                onChange={(e) => edit({ gaps: e.target.value })}
                placeholder="Where did you get stuck? List what to look up."
                className="resize-y rounded-xl border border-line bg-surface p-3"
              />
            </label>
            <p className="text-xs text-faint">Saved automatically on this device.</p>
          </div>
        )}
      </div>
    </div>
  )
}
