import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { StudySession } from '../lib/db'

export interface SessionDraft {
  subject: string
  notes: string
  startedAt: number
  durationMin: number
}

function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SessionDialog({
  session,
  subjects,
  onSave,
  onClose,
}: {
  session: StudySession | null
  subjects: string[]
  onSave: (draft: SessionDraft) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [subject, setSubject] = useState(session?.subject ?? '')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [start, setStart] = useState(toLocalInput(session?.startedAt ?? Date.now() - 3_600_000))
  const [minutes, setMinutes] = useState(session ? Math.max(1, Math.round(session.durationMs / 60_000)) : 60)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    onSave({ subject: subject.trim(), notes, startedAt: new Date(start).getTime(), durationMin: minutes })
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold">{session ? 'Edit session' : 'Add a past session'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Started
            <input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg border border-line bg-surface-2 px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Minutes
            <input type="number" required min={1} max={1440} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="rounded-lg border border-line bg-surface-2 px-2 py-2 font-mono" />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Subject
          <input list="subjects" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Organic chemistry" className="rounded-lg border border-line bg-surface-2 px-3 py-2" />
          <datalist id="subjects">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Notes
          <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you cover? What felt hard?" className="resize-y rounded-lg border border-line bg-surface-2 px-3 py-2" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className="rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
            Cancel
          </button>
          <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
            Save
          </button>
        </div>
      </form>
    </dialog>
  )
}
