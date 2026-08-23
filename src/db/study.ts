import { db, type Card, type Review } from './db'
import { shuffled } from '../lib/shuffle'
import {
  applySm2,
  createInitialSrsStats,
  reviewToSrsStats,
  srsStatsToReview,
  type Grade,
} from '../lib/srs'

export type StudyItem = {
  card: Card
  review: Review | null
}

const DEFAULT_NEW_CARD_LIMIT = 20

/**
 * Due reviews (due <= now, not new), plus a batch of new cards.
 * Pass deckId to scope to one deck; omit to study the whole library.
 */
export async function getStudyQueue(
  deckId?: string,
  newLimit = DEFAULT_NEW_CARD_LIMIT,
  now = Date.now(),
): Promise<StudyItem[]> {
  const cards = deckId
    ? await db.cards.where('deckId').equals(deckId).sortBy('createdAt')
    : await db.cards.orderBy('createdAt').toArray()
  if (cards.length === 0) return []

  const reviews = await db.reviews.bulkGet(cards.map((card) => card.id))
  const due: StudyItem[] = []
  const news: StudyItem[] = []

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]!
    const review = reviews[i] ?? null

    if (!review || review.state === 'new') {
      news.push({ card, review })
      continue
    }

    if (review.due <= now) {
      due.push({ card, review })
    }
  }

  return shuffled([...due, ...news.slice(0, newLimit)])
}

/** Apply a grade, upsert the review row, and return the updated review. */
export async function rateCard(
  cardId: string,
  grade: Grade,
  currentReview?: Review | null,
): Promise<Review> {
  const existing =
    currentReview === undefined
      ? ((await db.reviews.get(cardId)) ?? null)
      : currentReview

  const next = applySm2(reviewToSrsStats(existing), grade)
  const review = srsStatsToReview(cardId, next)
  await db.reviews.put(review)
  return review
}

/** Ensure a new card starts with a 'new' review row. */
export async function ensureNewReview(cardId: string): Promise<void> {
  const existing = await db.reviews.get(cardId)
  if (existing) return
  await db.reviews.add(srsStatsToReview(cardId, createInitialSrsStats()))
}
