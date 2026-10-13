import { useLiveQuery } from 'dexie-react-hooks'
import { Layers, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, PageHeader } from '../../components/ui'
import { db } from '../../lib/db'
import { createDeck } from '../../lib/decks'

export function DecksPage() {
  const navigate = useNavigate()
  const decks = useLiveQuery(() => db.decks.orderBy('name').toArray(), [], [])
  const cards = useLiveQuery(() => db.cards.toArray(), [], [])
  const [name, setName] = useState('')
  const now = Date.now()

  const stats = (deckId: string) => {
    const mine = cards.filter((c) => c.deckId === deckId)
    return { total: mine.length, due: mine.filter((c) => c.due <= now).length }
  }
  const totalDue = cards.filter((c) => c.due <= now).length

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const id = await createDeck(name)
    setName('')
    navigate(`/cards/${id}`)
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <PageHeader title="Flashcards" subtitle={totalDue ? `${totalDue} cards due for review` : 'Nothing due right now.'} />

      <form onSubmit={submit} className="mb-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New deck name, e.g. Biology unit 3"
          aria-label="New deck name"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5"
        />
        <button type="submit" className="flex items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">
          <Plus size={16} /> Create
        </button>
      </form>

      {decks.length === 0 ? (
        <Card className="py-12 text-center text-dim">Create your first deck to start adding cards.</Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {decks.map((d) => {
            const s = stats(d.id)
            return (
              <li key={d.id}>
                <Card className="flex h-full flex-col gap-4">
                  <Link to={`/cards/${d.id}`} className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent">
                      <Layers size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="text-sm text-dim">
                        {s.total} cards · <span className={s.due ? 'text-accent' : ''}>{s.due} due</span>
                      </p>
                    </div>
                  </Link>
                  <Link
                    to={`/cards/${d.id}/review`}
                    aria-disabled={!s.due}
                    className={
                      s.due
                        ? 'rounded-xl bg-accent py-2 text-center text-sm font-semibold text-accent-ink'
                        : 'pointer-events-none rounded-xl border border-line py-2 text-center text-sm text-faint'
                    }
                  >
                    {s.due ? `Review ${s.due}` : 'All caught up'}
                  </Link>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
