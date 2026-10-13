import { useLiveQuery } from 'dexie-react-hooks'
import { Check, RotateCcw, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Card, PageHeader } from '../../components/ui'
import { db, type Card as CardRow } from '../../lib/db'

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Free-recall drill: type the answer from memory, then mark yourself. Does not change review schedules. */
export function QuickRecallPage() {
  const decks = useLiveQuery(() => db.decks.orderBy('name').toArray(), [], [])
  const [round, setRound] = useState<{ cards: CardRow[]; index: number; right: number; missed: CardRow[] } | null>(null)
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)

  async function start(deckId: string, only?: CardRow[]) {
    const cards = only ?? (await db.cards.where('deckId').equals(deckId).toArray())
    setRound({ cards: shuffle(cards).slice(0, 20), index: 0, right: 0, missed: [] })
    setAnswer('')
    setRevealed(false)
  }

  function mark(correct: boolean) {
    if (!round) return
    const card = round.cards[round.index]
    setRound({ ...round, index: round.index + 1, right: round.right + (correct ? 1 : 0), missed: correct ? round.missed : [...round.missed, card] })
    setAnswer('')
    setRevealed(false)
  }

  function reveal(e: FormEvent) {
    e.preventDefault()
    setRevealed(true)
  }

  if (!round) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <PageHeader title="Quick recall" subtitle="Answer up to 20 questions from memory, then check yourself. Your review schedule is not affected." />
        {decks.length === 0 ? (
          <Card className="py-12 text-center text-dim">
            Quick recall uses your flashcard decks. <Link to="/cards" className="text-accent">Create a deck first.</Link>
          </Card>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {decks.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => void start(d.id)} className="w-full rounded-xl border border-line bg-surface p-4 text-left hover:bg-surface-2">
                  <span className="font-medium">{d.name}</span>
                  <span className="block text-sm text-dim">Start a round</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const card = round.cards[round.index]

  if (!card) {
    const total = round.cards.length
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <p className="font-mono text-5xl font-bold">
          {round.right}/{total}
        </p>
        <p className="text-dim">{round.missed.length ? `${round.missed.length} to go over again.` : 'A perfect round.'}</p>
        <div className="flex gap-2">
          {round.missed.length > 0 && (
            <button type="button" onClick={() => void start('', round.missed)} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
              <RotateCcw size={14} /> Retry missed
            </button>
          )}
          <button type="button" onClick={() => setRound(null)} className="rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
            Choose another deck
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 py-6">
      <div className="flex justify-between text-sm text-dim">
        <button type="button" onClick={() => setRound(null)} className="hover:text-ink">
          End round
        </button>
        <span>
          {round.index + 1} of {round.cards.length} · {round.right} right
        </span>
      </div>
      <Card className="py-10 text-center">
        <p className="whitespace-pre-line text-xl">{card.front}</p>
      </Card>
      <form onSubmit={reveal} className="flex flex-col gap-3">
        <textarea
          autoFocus
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={revealed}
          aria-label="Your answer"
          placeholder="Type what you remember…"
          className="resize-none rounded-xl border border-line bg-surface px-4 py-3"
        />
        {!revealed && (
          <button type="submit" className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink">
            Check answer
          </button>
        )}
      </form>
      {revealed && (
        <>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider text-faint">Answer</p>
            <p className="mt-1 whitespace-pre-line">{card.back}</p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => mark(false)} className="flex items-center justify-center gap-2 rounded-xl border border-danger/50 py-3 text-sm font-medium text-danger">
              <X size={16} /> I missed it
            </button>
            <button type="button" onClick={() => mark(true)} className="flex items-center justify-center gap-2 rounded-xl border border-accent/60 py-3 text-sm font-medium text-accent">
              <Check size={16} /> I got it
            </button>
          </div>
        </>
      )}
    </div>
  )
}
