import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Pencil, Trash2, Upload } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card, NotFound, PageHeader } from '../../components/ui'
import { db, type Card as CardRow } from '../../lib/db'
import { addCard, deleteDeck, editCard, parseImport, renameDeck } from '../../lib/decks'

function dueLabel(due: number, now: number): string {
  if (due <= now) return 'Due now'
  const days = Math.round((due - now) / 86_400_000)
  return days === 0 ? 'Later today' : `In ${days}d`
}

export function DeckPage() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  // undefined while loading, null when the deck doesn't exist.
  const deck = useLiveQuery(async () => (await db.decks.get(deckId)) ?? null, [deckId])
  const cards = useLiveQuery(() => db.cards.where('deckId').equals(deckId).sortBy('createdAt'), [deckId], [])
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [editing, setEditing] = useState<CardRow | null>(null)
  const [importText, setImportText] = useState<string | null>(null)
  const now = Date.now()
  const due = cards.filter((c) => c.due <= now).length

  if (deck === undefined) return null
  if (deck === null) return <NotFound title="Deck not found" back="/cards" backLabel="Back to flashcards" />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    if (editing) await editCard(editing.id, front, back)
    else await addCard(deckId, front, back)
    setFront('')
    setBack('')
    setEditing(null)
  }

  async function runImport() {
    for (const r of parseImport(importText ?? '')) await addCard(deckId, r.front, r.back)
    setImportText(null)
  }

  function startEdit(c: CardRow) {
    setEditing(c)
    setFront(c.front)
    setBack(c.back)
  }

  function cancelEdit() {
    setEditing(null)
    setFront('')
    setBack('')
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <Link to="/cards" className="mb-4 inline-flex items-center gap-1 text-sm text-dim hover:text-ink">
        <ArrowLeft size={14} /> All decks
      </Link>
      <PageHeader
        title={deck.name}
        subtitle={`${cards.length} cards · ${due} due`}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const n = window.prompt('Rename deck', deck.name)
                if (n !== null) void renameDeck(deck.id, n)
              }}
              className="rounded-xl border border-line px-3 py-2 text-sm text-dim hover:text-ink"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`Delete "${deck.name}" and all its cards?`)) {
                  await deleteDeck(deck.id)
                  navigate('/cards')
                }
              }}
              className="rounded-xl border border-line px-3 py-2 text-sm text-dim hover:text-danger"
            >
              Delete
            </button>
            <Link
              to={`/cards/${deck.id}/review`}
              className={
                due
                  ? 'rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink'
                  : 'pointer-events-none rounded-xl border border-line px-4 py-2 text-sm text-faint'
              }
            >
              Review {due || ''}
            </Link>
          </div>
        }
      />

      <Card className="mb-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Question
              <textarea rows={3} value={front} onChange={(e) => setFront(e.target.value)} className="resize-y rounded-lg border border-line bg-surface-2 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Answer
              <textarea rows={3} value={back} onChange={(e) => setBack(e.target.value)} className="resize-y rounded-lg border border-line bg-surface-2 px-3 py-2" />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => setImportText('')} className="flex items-center gap-1 text-sm text-dim hover:text-ink">
              <Upload size={14} /> Import many
            </button>
            <div className="flex gap-2">
              {editing && (
                <button type="button" onClick={cancelEdit} className="rounded-xl border border-line px-4 py-2 text-sm text-dim">
                  Cancel
                </button>
              )}
              <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
                {editing ? 'Save card' : 'Add card'}
              </button>
            </div>
          </div>
        </form>
        {importText !== null && (
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm text-dim">
              One card per line: the question, then a Tab or semicolon, then the answer. Exports from Anki and spreadsheets work.
            </p>
            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'Speed of light; about 300,000 km/s\nLargest planet; Jupiter'}
              className="rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setImportText(null)} className="rounded-xl border border-line px-4 py-2 text-sm text-dim">
                Cancel
              </button>
              <button type="button" onClick={() => void runImport()} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
                Import {parseImport(importText).length} cards
              </button>
            </div>
          </div>
        )}
      </Card>

      <ul className="flex flex-col gap-2">
        {cards.map((c) => (
          <li key={c.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-4 rounded-xl border border-line bg-surface p-4 text-sm">
            <p className="whitespace-pre-line">{c.front}</p>
            <p className="whitespace-pre-line text-dim">{c.back}</p>
            <div className="flex items-center gap-1">
              <span className="mr-2 whitespace-nowrap text-xs text-faint">{dueLabel(c.due, now)}</span>
              <button type="button" aria-label="Edit card" onClick={() => startEdit(c)} className="grid size-8 place-items-center rounded-lg text-dim hover:bg-surface-2 hover:text-ink">
                <Pencil size={14} />
              </button>
              <button type="button" aria-label="Delete card" onClick={() => window.confirm('Delete this card?') && void db.cards.delete(c.id)} className="grid size-8 place-items-center rounded-lg text-dim hover:bg-surface-2 hover:text-danger">
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
