import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { isNewCard } from '@/lib/fsrsService'

export type DeckListStats = {
  totalCards: number
  dueToday: number
}

async function loadDeckStats(): Promise<Record<string, DeckListStats>> {
  const cards = await db.cards.toArray()
  const now = Date.now()
  const stats: Record<string, DeckListStats> = {}

  for (const card of cards) {
    if (!card.deckId) continue
    const entry = stats[card.deckId] ?? { totalCards: 0, dueToday: 0 }
    entry.totalCards += 1
    // New cards are always available; others only when due.
    if (isNewCard(card) || card.due <= now) {
      entry.dueToday += 1
    }
    stats[card.deckId] = entry
  }

  return stats
}

/** Live per-deck card totals and due-today counts. */
export function useDeckStats(): Record<string, DeckListStats> {
  return useLiveQuery(loadDeckStats, []) ?? {}
}
