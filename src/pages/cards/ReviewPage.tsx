import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { NotFound } from '../../components/ui'
import { db, type Card } from '../../lib/db'
import { gradeCard } from '../../lib/decks'
import { previewLabel, type Grade } from '../../lib/srs'

const GRADES: { grade: Grade; label: string; key: string; tone: string }[] = [
  { grade: 'again', label: 'Again', key: '1', tone: 'border-danger/50 text-danger' },
  { grade: 'hard', label: 'Hard', key: '2', tone: 'border-warm/50 text-warm' },
  { grade: 'good', label: 'Good', key: '3', tone: 'border-accent/60 text-accent' },
  { grade: 'easy', label: 'Easy', key: '4', tone: 'border-line text-ink' },
]

export function ReviewPage() {
  const { deckId = '' } = useParams()
  // undefined while loading, null when the deck doesn't exist.
  const deck = useLiveQuery(async () => (await db.decks.get(deckId)) ?? null, [deckId])
  // Snapshot the due queue once so graded cards don't reshuffle mid-session.
  const [queue, setQueue] = useState<Card[] | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(0)

  useEffect(() => {
    const now = Date.now()
    void db.cards
      .where('deckId')
      .equals(deckId)
      .filter((c) => c.due <= now)
      .sortBy('due')
      .then(setQueue)
  }, [deckId])

  const card = queue?.[0]

  async function grade(g: Grade) {
    if (!card) return
    await gradeCard(card, g)
    setRevealed(false)
    setDone((n) => n + 1)
    // "Again" puts the card back at the end of this session's queue.
    setQueue((q) => (q ? (g === 'again' ? [...q.slice(1), q[0]] : q.slice(1)) : q))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card) return
      if (!revealed && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
        return
      }
      const g = revealed && GRADES.find((x) => x.key === e.key)
      if (g) void grade(g.grade)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (deck === null) return <NotFound title="Deck not found" back="/cards" backLabel="Back to flashcards" />
  if (!queue || deck === undefined) return null
  const now = Date.now()

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col py-6">
      <div className="mb-6 flex items-center justify-between text-sm text-dim">
        <Link to={`/cards/${deckId}`} className="inline-flex items-center gap-1 hover:text-ink">
          <ArrowLeft size={14} /> {deck?.name ?? 'Deck'}
        </Link>
        <span>
          {done} reviewed · {queue.length} left
        </span>
      </div>

      {!card ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <PartyPopper size={36} className="text-accent" />
          <h1 className="text-xl font-semibold">All caught up</h1>
          <p className="text-dim">You reviewed {done} cards. New reviews will appear as they come due.</p>
          <Link to="/cards" className="mt-2 rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
            Back to decks
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-6 rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="whitespace-pre-line text-xl">{card.front}</p>
            {revealed && (
              <>
                <div className="h-px w-24 bg-line" />
                <p className="whitespace-pre-line text-lg text-dim">{card.back}</p>
              </>
            )}
          </div>

          {!revealed ? (
            <button type="button" onClick={() => setRevealed(true)} className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink">
              Show answer <span className="ml-1 opacity-60">(Space)</span>
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => void grade(g.grade)}
                  className={`flex flex-col items-center rounded-xl border bg-surface py-2.5 text-sm font-medium hover:bg-surface-2 ${g.tone}`}
                >
                  {g.label}
                  <span className="text-[11px] font-normal text-faint">
                    {previewLabel(card, g.grade, now)} · {g.key}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
