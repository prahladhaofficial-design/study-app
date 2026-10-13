import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Card, PageHeader } from '../components/ui'
import { db, newId, type Moment } from '../lib/db'
import { resizeImage } from '../lib/image'
import { dayKey } from '../lib/time'

function monthLabel(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** A photo journal: your desk, your notes, the view at the end of a long day. */
export function MomentsPage() {
  const moments = useLiveQuery(() => db.moments.orderBy('day').reverse().toArray(), [], [])
  const fileInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<{ image: string; caption: string; day: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<number | null>(null)

  async function pick(file: File | undefined) {
    if (!file) return
    setError('')
    setBusy(true)
    try {
      setDraft({ image: await resizeImage(file), caption: '', day: dayKey(new Date()) })
    } catch {
      setError("That file couldn't be opened as an image.")
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function save() {
    if (!draft) return
    const now = Date.now()
    await db.moments.add({ id: newId(), day: draft.day, caption: draft.caption.trim(), image: draft.image, createdAt: now, updatedAt: now })
    setDraft(null)
  }

  async function remove(m: Moment) {
    if (!window.confirm('Delete this moment?')) return
    await db.moments.delete(m.id)
    setViewing(null)
  }

  // Group by month, newest first.
  const months: { label: string; items: { m: Moment; index: number }[] }[] = []
  moments.forEach((m, index) => {
    const label = monthLabel(m.day)
    const last = months[months.length - 1]
    if (last?.label === label) last.items.push({ m, index })
    else months.push({ label, items: [{ m, index }] })
  })

  return (
    <div className="mx-auto max-w-5xl py-6">
      <PageHeader
        title="Moments"
        subtitle="A visual diary of your study days. Photos are backed up privately and appear on all your devices."
        actions={
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            <ImagePlus size={16} /> {busy ? 'Opening…' : 'Add photo'}
          </button>
        }
      />
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {draft && (
        <Card className="mb-6 grid gap-4 md:grid-cols-[1fr_18rem]">
          <img src={draft.image} alt="New moment preview" className="max-h-96 w-full rounded-xl object-contain" />
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Caption
              <textarea
                autoFocus
                rows={3}
                value={draft.caption}
                onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
                placeholder="What were you working on?"
                className="resize-none rounded-lg border border-line bg-surface-2 p-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Day
              <input type="date" value={draft.day} max={dayKey(new Date())} onChange={(e) => setDraft({ ...draft, day: e.target.value || draft.day })} className="rounded-lg border border-line bg-surface-2 px-3 py-2" />
            </label>
            <div className="mt-auto flex gap-2">
              <button type="button" onClick={() => setDraft(null)} className="flex-1 rounded-xl border border-line py-2 text-sm text-dim hover:text-ink">
                Cancel
              </button>
              <button type="button" onClick={() => void save()} className="flex-1 rounded-xl bg-accent py-2 text-sm font-semibold text-accent-ink">
                Save
              </button>
            </div>
          </div>
        </Card>
      )}

      {moments.length === 0 && !draft ? (
        <Card className="py-14 text-center text-dim">
          <p>No moments yet.</p>
          <p className="mt-1 text-sm text-faint">Snap your desk or notes after a session and look back on how far you have come.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {months.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 text-sm font-semibold text-dim">{group.label}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {group.items.map(({ m, index }) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setViewing(index)} className="block w-full overflow-hidden rounded-xl border border-line text-left hover:border-accent">
                      <img src={m.image} alt={m.caption || 'Study moment'} loading="lazy" className="aspect-square w-full object-cover" />
                      <div className="bg-surface px-3 py-2">
                        <p className="text-[11px] text-faint">{new Date(`${m.day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                        {m.caption && <p className="truncate text-xs">{m.caption}</p>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {viewing !== null && moments[viewing] && (
        <Lightbox
          moment={moments[viewing]}
          onClose={() => setViewing(null)}
          onPrev={viewing > 0 ? () => setViewing(viewing - 1) : undefined}
          onNext={viewing < moments.length - 1 ? () => setViewing(viewing + 1) : undefined}
          onDelete={() => void remove(moments[viewing])}
        />
      )}
    </div>
  )
}

function Lightbox({ moment, onClose, onPrev, onNext, onDelete }: { moment: Moment; onClose: () => void; onPrev?: () => void; onNext?: () => void; onDelete: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev?.()
      if (e.key === 'ArrowRight') onNext?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  const nav = 'absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70'
  return (
    <div role="dialog" aria-modal="true" aria-label="Moment" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-4" onClick={onClose}>
      <div className="relative max-h-[80vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <img src={moment.image} alt={moment.caption || 'Study moment'} className="max-h-[80vh] rounded-xl object-contain" />
        {onPrev && (
          <button type="button" aria-label="Previous" onClick={onPrev} className={`${nav} left-2`}>
            <ChevronLeft size={20} />
          </button>
        )}
        {onNext && (
          <button type="button" aria-label="Next" onClick={onNext} className={`${nav} right-2`}>
            <ChevronRight size={20} />
          </button>
        )}
      </div>
      <div className="flex max-w-xl items-center gap-4 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-white/60">{new Date(`${moment.day}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
          {moment.caption && <p className="mt-1">{moment.caption}</p>}
        </div>
        <button type="button" aria-label="Delete moment" onClick={onDelete} className="rounded-lg p-2 text-white/70 hover:text-red-400">
          <Trash2 size={16} />
        </button>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-white/70 hover:text-white">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
