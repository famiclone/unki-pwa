import { useLiveQuery } from 'dexie-react-hooks'
import { createInitialSrsStats, srsStatsToReview } from '../lib/srs'
import { db, type Card, type Deck } from './db'

export type CreateDeckInput = {
  name: string
}

export type AddCardInput = {
  deckId: string
  front: string
  back: string
  romaji?: string
  /** Image as Blob or File; stored directly in IndexedDB. */
  image?: Blob | File | null
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
  image,
}: AddCardInput): Promise<Card> {
  // File extends Blob; Dexie stores either as a Blob in IndexedDB.
  const imageBlob = image instanceof Blob ? image : undefined

  const card: Card = {
    id: crypto.randomUUID(),
    deckId,
    front: front.trim(),
    back: back.trim(),
    createdAt: Date.now(),
    ...(romaji?.trim() ? { romaji: romaji.trim() } : {}),
    ...(imageBlob ? { image: imageBlob } : {}),
  }

  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.add(card)
    await db.reviews.add(srsStatsToReview(card.id, createInitialSrsStats()))
  })
  return card
}

async function getCardsByDeck(deckId: string): Promise<Card[]> {
  return db.cards.where('deckId').equals(deckId).sortBy('createdAt')
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
    getCardsByDeck,
  }
}

export { createDeck, deleteDeck, addCard, getCardsByDeck }
