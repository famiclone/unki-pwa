import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

export type CardStats = {
  /** Cards in review state (Learned). */
  learned: number
  /** Cards in learning state (In progress). */
  learning: number
  /** Cards in new state, plus any cards missing a review row (Not started). */
  new: number
}

async function loadCardStats(): Promise<CardStats> {
  const [reviews, cardCount] = await Promise.all([
    db.reviews.toArray(),
    db.cards.count(),
  ])

  let learned = 0
  let learning = 0
  let notStarted = 0

  for (const review of reviews) {
    if (review.state === 'review') learned += 1
    else if (review.state === 'learning') learning += 1
    else notStarted += 1
  }

  // Older / edge-case cards without a review row count as new.
  const missingReviews = Math.max(0, cardCount - reviews.length)
  notStarted += missingReviews

  return {
    learned,
    learning,
    new: notStarted,
  }
}

/**
 * Live counts of cards by SRS state from the reviews table.
 * Re-renders when reviews (or card count gaps) change.
 */
export function useCardStats(): CardStats {
  const stats = useLiveQuery(loadCardStats, [])

  return (
    stats ?? {
      learned: 0,
      learning: 0,
      new: 0,
    }
  )
}
