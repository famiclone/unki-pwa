import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

export type DeckListStats = {
  totalCards: number
  dueToday: number
}

async function loadDeckStats(): Promise<Record<string, DeckListStats>> {
  const [cards, reviews] = await Promise.all([
    db.cards.toArray(),
    db.reviews.toArray(),
  ])
  const reviewByCard = new Map(reviews.map((review) => [review.cardId, review]))
  const now = Date.now()
  const stats: Record<string, DeckListStats> = {}

  for (const card of cards) {
    if (!card.deckId) continue
    const entry = stats[card.deckId] ?? { totalCards: 0, dueToday: 0 }
    entry.totalCards += 1
    const review = reviewByCard.get(card.id)
    if (!review || review.due <= now) {
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
