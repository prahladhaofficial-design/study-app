import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card, PageHeader } from '../../components/ui'
import { compareRecall } from '../../lib/compare'
import { db, newId, type BrainDump } from '../../lib/db'
import { formatClock } from '../../lib/time'

const TIME_OPTIONS = [3, 5, 10, 0]

type Step = 'setup' | 'recall' | 'compare'

/** Write everything you remember on a topic, then paste the source to see what you missed. */
export function BrainDumpPage() {
  const history = useLiveQuery(() => db.dumps.orderBy('createdAt').reverse().limit(20).toArray(), [], [])
  const [step, setStep] = useState<Step>('setup')
  const [topic, setTopic] = useState('')
  const [minutes, setMinutes] = useState(5)
  const [recalled, setRecalled] = useState('')
  const [source, setSource] = useState('')
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    if (step !== 'recall' || !endsAt) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [step, endsAt])

  const remaining = endsAt ? Math.max(0, endsAt - now) : null
  useEffect(() => {
    if (remaining === 0 && step === 'recall') setStep('compare')
  }, [remaining, step])

  const result = useMemo(() => (source.trim() ? compareRecall(source, recalled) : null), [source, recalled])

  function begin() {
    setRecalled('')
    setSource('')
    setSavedId(null)
    setEndsAt(minutes ? Date.now() + minutes * 60_000 : null)
    setNow(Date.now())
    setStep('recall')
  }

  async function save() {
    const now = Date.now()
    const row: BrainDump = {
      id: savedId ?? newId(),
      topic: topic.trim() || 'Untitled',
      recalled,
      source,
      coverage: result ? result.coverage : null,
      createdAt: now,
      updatedAt: now,
    }
    await db.dumps.put(row)
    setSavedId(row.id)
  }

  function open(d: BrainDump) {
    setTopic(d.topic)
    setRecalled(d.recalled)
    setSource(d.source)
    setSavedId(d.id)
    setStep('compare')
  }

  return (
    <div className="mx-auto max-w-4xl py-6">
      <PageHeader title="Brain dump" subtitle="Close your notes, write everything you remember, then compare with the source." />

      {step === 'setup' && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="flex flex-col gap-4 md:col-span-3">
            <label className="flex flex-col gap-1 text-sm">
              Topic
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The Krebs cycle" className="rounded-lg border border-line bg-surface-2 px-3 py-2" />
            </label>
            <div className="flex flex-col gap-2 text-sm">
              Time limit
              <div className="flex gap-2">
                {TIME_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    className={clsx('rounded-lg px-3 py-1.5', minutes === m ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-dim hover:text-ink')}
                  >
                    {m ? `${m} min` : 'No limit'}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={begin} className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink">
              Start writing
            </button>
          </Card>
          <Card className="md:col-span-2">
            <h2 className="mb-3 text-sm font-semibold">Past dumps</h2>
            {history.length === 0 ? (
              <p className="text-sm text-faint">None yet.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {history.map((d) => (
                  <li key={d.id} className="group flex items-center justify-between gap-2">
                    <button type="button" onClick={() => open(d)} className="min-w-0 truncate text-left text-dim hover:text-ink">
                      {d.topic}
                    </button>
                    <span className="flex items-center gap-2">
                      {d.coverage !== null && <span className="font-mono text-xs text-accent">{Math.round(d.coverage * 100)}%</span>}
                      <button type="button" aria-label="Delete" onClick={() => void db.dumps.delete(d.id)} className="text-faint opacity-0 hover:text-danger group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {step === 'recall' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-medium">{topic || 'Untitled'}</p>
            {remaining !== null && <span className="font-mono text-2xl font-bold tabular-nums">{formatClock(remaining)}</span>}
          </div>
          <textarea
            autoFocus
            rows={16}
            value={recalled}
            onChange={(e) => setRecalled(e.target.value)}
            placeholder="Everything you remember, in any order. Don't look anything up."
            aria-label="What you remember"
            className="resize-y rounded-2xl border border-line bg-surface p-4 leading-relaxed"
          />
          <button type="button" onClick={() => setStep('compare')} className="self-end rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            I'm done
          </button>
        </div>
      )}

      {step === 'compare' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="mb-2 text-sm font-semibold">What you recalled</h2>
              <p className="whitespace-pre-line text-sm text-dim">{recalled || 'Nothing written.'}</p>
            </Card>
            <Card className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Source material</h2>
              <textarea
                rows={8}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Paste the notes or textbook passage you studied."
                aria-label="Source material"
                className="resize-y rounded-lg border border-line bg-surface-2 p-3 text-sm"
              />
            </Card>
          </div>

          {result && (
            <Card>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Key terms covered</h2>
                <span className="font-mono text-2xl font-bold text-accent">{Math.round(result.coverage * 100)}%</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.missing.map((t) => (
                  <span key={t} className="rounded-full border border-warm/50 px-2.5 py-0.5 text-xs text-warm">
                    {t}
                  </span>
                ))}
                {result.found.map((t) => (
                  <span key={t} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent">
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-faint">Amber terms appear in the source but not in what you wrote. Re-study those first.</p>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setStep('setup')} className="rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
              New dump
            </button>
            <button type="button" onClick={() => void save()} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
              {savedId ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
