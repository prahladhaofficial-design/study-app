import { db, newId, type Card } from './db'
import { newCardState, review, type Grade } from './srs'

export async function createDeck(name: string): Promise<string> {
  const id = newId()
  const now = Date.now()
  await db.decks.add({ id, name: name.trim() || 'Untitled deck', createdAt: now, updatedAt: now })
  return id
}

export async function renameDeck(id: string, name: string): Promise<void> {
  await db.decks.update(id, { name: name.trim() || 'Untitled deck', updatedAt: Date.now() })
}

export async function deleteDeck(id: string): Promise<void> {
  await db.transaction('rw', db.decks, db.cards, async () => {
    await db.cards.where('deckId').equals(id).delete()
    await db.decks.delete(id)
  })
}

export async function addCard(deckId: string, front: string, back: string): Promise<void> {
  const now = Date.now()
  await db.cards.add({ id: newId(), deckId, front: front.trim(), back: back.trim(), ...newCardState(now), createdAt: now, updatedAt: now })
}

export async function editCard(id: string, front: string, back: string): Promise<void> {
  await db.cards.update(id, { front: front.trim(), back: back.trim(), updatedAt: Date.now() })
}

export async function gradeCard(card: Card, grade: Grade): Promise<void> {
  const now = Date.now()
  await db.cards.update(card.id, { ...review(card, grade, now), updatedAt: now })
}

/** Parses "front<TAB or ;>back" lines (Anki/CSV style) into card pairs. */
export function parseImport(text: string): { front: string; back: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const sep = line.includes('\t') ? '\t' : ';'
      const i = line.indexOf(sep)
      return i > 0 ? { front: line.slice(0, i).trim(), back: line.slice(i + 1).trim() } : null
    })
    .filter((c): c is { front: string; back: string } => !!c && !!c.front && !!c.back)
}
