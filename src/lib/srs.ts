// Spaced-repetition scheduler (an SM-2 style variant with four grades).
// Each review moves the card's due date further out when recalled and
// back to "soon" when forgotten, while adjusting a per-card ease factor.

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface SrsState {
  due: number
  intervalDays: number
  ease: number
  reps: number
  lapses: number
}

const DAY = 86_400_000
const MIN = 60_000
export const START_EASE = 2.5
const MIN_EASE = 1.3
const MAX_INTERVAL_DAYS = 3650

export const newCardState = (now: number): SrsState => ({ due: now, intervalDays: 0, ease: START_EASE, reps: 0, lapses: 0 })

export function review(card: SrsState, grade: Grade, now: number): SrsState {
  if (grade === 'again') {
    return { due: now + 10 * MIN, intervalDays: 0, ease: Math.max(MIN_EASE, card.ease - 0.2), reps: 0, lapses: card.lapses + (card.reps > 0 ? 1 : 0) }
  }

  const ease = Math.max(MIN_EASE, card.ease + (grade === 'hard' ? -0.15 : grade === 'easy' ? 0.15 : 0))
  let interval: number
  if (card.reps === 0) {
    interval = grade === 'hard' ? 0 : grade === 'good' ? 1 : 4
  } else if (card.reps === 1) {
    interval = grade === 'hard' ? Math.max(1, card.intervalDays) : grade === 'good' ? 3 : 6
  } else {
    const base = Math.max(1, card.intervalDays)
    const mult = grade === 'hard' ? 1.2 : grade === 'good' ? ease : ease * 1.3
    interval = Math.max(base + 1, Math.round(base * mult))
  }
  interval = Math.min(MAX_INTERVAL_DAYS, interval)

  // "Hard" on a brand-new card means review it again later today.
  const due = interval === 0 ? now + 30 * MIN : now + interval * DAY
  return { due, intervalDays: interval, ease, reps: card.reps + 1, lapses: card.lapses }
}

/** Short label for when a grade would schedule the card next, e.g. "10m", "3d". */
export function previewLabel(card: SrsState, grade: Grade, now: number): string {
  const ms = review(card, grade, now).due - now
  if (ms < 60 * MIN) return `${Math.round(ms / MIN)}m`
  if (ms < DAY) return `${Math.round(ms / (60 * MIN))}h`
  const days = Math.round(ms / DAY)
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export const isDue = (card: Pick<SrsState, 'due'>, now: number) => card.due <= now
