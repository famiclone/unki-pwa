import { useLiveQuery } from 'dexie-react-hooks'
import { State } from 'ts-fsrs'
import { db } from '@/db'
import { isNewCard } from '@/lib/fsrsService'

export type DeckListStats = {
  totalCards: number
  dueToday: number
  learnedCards: number
  progressPercent: number
}

const EMPTY_STATS: DeckListStats = {
  totalCards: 0,
  dueToday: 0,
  learnedCards: 0,
  progressPercent: 0,
}

async function loadDeckStats(): Promise<Record<string, DeckListStats>> {
  const cards = await db.cards.toArray()
  const now = Date.now()
  const stats: Record<string, Omit<DeckListStats, 'progressPercent'>> = {}

  for (const card of cards) {
    if (!card.deckId) continue
    const entry = stats[card.deckId] ?? {
      totalCards: 0,
      dueToday: 0,
      learnedCards: 0,
    }
    entry.totalCards += 1
    // New cards are always available; others only when due.
    if (isNewCard(card) || card.due <= now) {
      entry.dueToday += 1
    }
    if (card.state === State.Review) {
      entry.learnedCards += 1
    }
    stats[card.deckId] = entry
  }

  const withProgress: Record<string, DeckListStats> = {}
  for (const [deckId, entry] of Object.entries(stats)) {
    withProgress[deckId] = {
      ...entry,
      progressPercent:
        entry.totalCards > 0
          ? Math.round((entry.learnedCards / entry.totalCards) * 100)
          : 0,
    }
  }

  return withProgress
}

/** Live per-deck card totals, due-today, and FSRS Review mastery. */
export function useDeckStats(): Record<string, DeckListStats> {
  return useLiveQuery(loadDeckStats, []) ?? {}
}

export { EMPTY_STATS as EMPTY_DECK_STATS }
