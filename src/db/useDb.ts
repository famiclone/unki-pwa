import { useLiveQuery } from 'dexie-react-hooks'
import { createInitialSrsStats, srsStatsToReview } from '../lib/srs'
import { db, type Card, type Deck, type Review, type ReviewState } from './db'

export type CreateDeckInput = {
  name: string
}

export type AddCardInput = {
  deckId?: string
  front: string
  back: string
  romaji?: string
  example?: string
  /** Image as Blob or File; stored directly in IndexedDB. */
  image?: Blob | File | null
}

export type UpdateCardInput = {
  id: string
  front: string
  back: string
  romaji?: string
  example?: string
  /** Pass a Blob/File to replace; null to clear; undefined to keep. */
  image?: Blob | File | null
}

export type CardStateFilter = 'all' | ReviewState

export type CardsPageQuery = {
  offset: number
  limit: number
  search?: string
  state?: CardStateFilter
}

export type CardsPageResult = {
  items: Array<{ card: Card; review: Review | null }>
  hasMore: boolean
}

const DEFAULT_DECK_NAME = 'Main'

async function ensureDefaultDeck(): Promise<Deck> {
  const existing = await db.decks.orderBy('createdAt').first()
  if (existing) return existing
  return createDeck({ name: DEFAULT_DECK_NAME })
}

async function createDeck({ name }: CreateDeckInput): Promise<Deck> {
  const deck: Deck = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: Date.now(),
  }
  await db.decks.add(deck)
  return deck
}

async function deleteDeck(deckId: string): Promise<void> {
  await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
    const cardIds = await db.cards.where('deckId').equals(deckId).primaryKeys()
    if (cardIds.length > 0) {
      await db.reviews.bulkDelete(cardIds)
      await db.cards.bulkDelete(cardIds)
    }
    await db.decks.delete(deckId)
  })
}

async function addCard({
  deckId,
  front,
  back,
  romaji,
  example,
  image,
}: AddCardInput): Promise<Card> {
  const deck = deckId
    ? ((await db.decks.get(deckId)) ?? (await ensureDefaultDeck()))
    : await ensureDefaultDeck()

  const imageBlob = image instanceof Blob ? image : undefined

  const card: Card = {
    id: crypto.randomUUID(),
    deckId: deck.id,
    front: front.trim(),
    back: back.trim(),
    createdAt: Date.now(),
    ...(romaji?.trim() ? { romaji: romaji.trim() } : {}),
    ...(example?.trim() ? { example: example.trim() } : {}),
    ...(imageBlob ? { image: imageBlob } : {}),
  }

  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.add(card)
    await db.reviews.add(srsStatsToReview(card.id, createInitialSrsStats()))
  })
  return card
}

async function updateCard({
  id,
  front,
  back,
  romaji,
  example,
  image,
}: UpdateCardInput): Promise<Card> {
  const existing = await db.cards.get(id)
  if (!existing) throw new Error('Card not found')

  const next: Card = {
    ...existing,
    front: front.trim(),
    back: back.trim(),
  }

  if (romaji !== undefined) {
    const trimmed = romaji.trim()
    if (trimmed) next.romaji = trimmed
    else delete next.romaji
  }

  if (example !== undefined) {
    const trimmed = example.trim()
    if (trimmed) next.example = trimmed
    else delete next.example
  }

  if (image === null) {
    delete next.image
  } else if (image instanceof Blob) {
    next.image = image
  }

  await db.cards.put(next)
  return next
}

async function deleteCard(cardId: string): Promise<void> {
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.reviews.delete(cardId)
    await db.cards.delete(cardId)
  })
}

async function resetCardProgress(cardId: string): Promise<Review> {
  const review = srsStatsToReview(cardId, createInitialSrsStats())
  await db.reviews.put(review)
  return review
}

async function getCardsByDeck(deckId: string): Promise<Card[]> {
  return db.cards.where('deckId').equals(deckId).sortBy('createdAt')
}

function matchesSearch(card: Card, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return (
    card.front.toLowerCase().includes(q) ||
    card.back.toLowerCase().includes(q) ||
    (card.romaji?.toLowerCase().includes(q) ?? false) ||
    (card.example?.toLowerCase().includes(q) ?? false)
  )
}

/**
 * Paginated cards from Dexie using offset/limit, with optional state + text filters.
 */
export async function getCardsPage({
  offset,
  limit,
  search = '',
  state = 'all',
}: CardsPageQuery): Promise<CardsPageResult> {
  const wantsSearch = search.trim().length > 0
  const wantsState = state !== 'all'

  // Fast path: pure pagination via Dexie offset/limit.
  if (!wantsSearch && !wantsState) {
    const cards = await db.cards
      .orderBy('createdAt')
      .reverse()
      .offset(offset)
      .limit(limit + 1)
      .toArray()

    const page = cards.slice(0, limit)
    const reviews = await db.reviews.bulkGet(page.map((card) => card.id))
    return {
      items: page.map((card, index) => ({
        card,
        review: reviews[index] ?? null,
      })),
      hasMore: cards.length > limit,
    }
  }

  // Filtered path: scan newest-first, then apply offset/limit on matches.
  const allCards = await db.cards.orderBy('createdAt').reverse().toArray()
  const matched: Card[] = []

  for (const card of allCards) {
    if (!matchesSearch(card, search)) continue

    if (wantsState) {
      const review = (await db.reviews.get(card.id)) ?? null
      const cardState: ReviewState = review?.state ?? 'new'
      if (cardState !== state) continue
    }

    matched.push(card)
  }

  const page = matched.slice(offset, offset + limit)
  const reviews = await db.reviews.bulkGet(page.map((card) => card.id))

  return {
    items: page.map((card, index) => ({
      card,
      review: reviews[index] ?? null,
    })),
    hasMore: offset + limit < matched.length,
  }
}

/**
 * Database hook for deck/card CRUD. Live queries re-render when IndexedDB changes.
 */
export function useDb(deckId?: string) {
  const decks = useLiveQuery(() => db.decks.orderBy('createdAt').toArray(), [])
  const cards = useLiveQuery(
    () => (deckId ? getCardsByDeck(deckId) : Promise.resolve([] as Card[])),
    [deckId],
  )

  return {
    decks: decks ?? [],
    cards: cards ?? [],
    createDeck,
    deleteDeck,
    addCard,
    updateCard,
    deleteCard,
    resetCardProgress,
    getCardsByDeck,
    ensureDefaultDeck,
    getCardsPage,
  }
}

export {
  createDeck,
  deleteDeck,
  addCard,
  updateCard,
  deleteCard,
  resetCardProgress,
  getCardsByDeck,
  ensureDefaultDeck,
}
