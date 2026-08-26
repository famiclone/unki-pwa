import { db, type Card } from './db'
import { shuffled } from '../lib/shuffle'
import {
  gradeCard,
  gradeToRating,
  isNewCard,
  sanitizeFsrsFields,
} from '../lib/fsrsService'
import type { Grade } from '../lib/srs'

export type StudyItem = {
  card: Card
}

const DEFAULT_NEW_CARD_LIMIT = 20

/**
 * Count of cards that would enter a study session: due non-new cards
 * plus up to `newLimit` new cards.
 */
export async function countStudyQueue(
  deckId?: string,
  newLimit = DEFAULT_NEW_CARD_LIMIT,
  now = Date.now(),
): Promise<number> {
  const cards = deckId
    ? await db.cards.where('deckId').equals(deckId).sortBy('createdAt')
    : await db.cards.orderBy('createdAt').toArray()
  if (cards.length === 0) return 0

  let due = 0
  let news = 0

  for (const card of cards) {
    if (isNewCard(card)) {
      news += 1
      continue
    }
    if (card.due <= now) due += 1
  }

  return due + Math.min(news, newLimit)
}

/**
 * Due cards (due <= now, not New), plus a capped batch of New cards.
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

  const due: StudyItem[] = []
  const news: StudyItem[] = []

  for (const card of cards) {
    if (isNewCard(card)) {
      news.push({ card })
      continue
    }
    if (card.due <= now) {
      due.push({ card })
    }
  }

  return shuffled([...due, ...news.slice(0, newLimit)])
}

/** Apply an FSRS grade and persist the updated card. */
export async function rateCard(
  cardId: string,
  grade: Grade,
  currentCard?: Card | null,
): Promise<Card> {
  const existing =
    currentCard === undefined
      ? ((await db.cards.get(cardId)) ?? null)
      : currentCard
  if (!existing) throw new Error('Card not found')

  const sanitized = { ...existing, ...sanitizeFsrsFields(existing) }
  const next = gradeCard(sanitized, gradeToRating(grade), new Date())
  await db.cards.put(next)
  return next
}

/** @deprecated FSRS fields are created with the card; kept for call-site compat. */
export async function ensureNewReview(_cardId: string): Promise<void> {
  // no-op — scheduling lives on the card row
}
