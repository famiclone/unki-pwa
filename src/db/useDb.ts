import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_DECK_COLOR, normalizeHexColor } from '../lib/colorUtils'
import { createNewFSRSCard, cardMatchesUiState } from '../lib/fsrsService'
import {
  db,
  hydrateCardWithFsrs,
  type Card,
  type Deck,
  type ReviewState,
} from './db'

export type CreateDeckInput = {
  name: string
  description?: string
  /** Cover image as Blob or File; stored directly in IndexedDB. */
  image?: Blob | File | null
  /** Accent color as a hex code. */
  color?: string
}

export type UpdateDeckInput = {
  id: string
  name: string
  description?: string
  /** Pass a Blob/File to replace; null to clear; undefined to keep. */
  image?: Blob | File | null
  /** Accent color as a hex code. */
  color?: string
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
  /** When set, only cards belonging to this deck. */
  deckId?: string | null
}

export type CardsPageResult = {
  items: Array<{ card: Card }>
  hasMore: boolean
}

const DEFAULT_DECK_NAME = 'Main'

async function ensureDefaultDeck(): Promise<Deck> {
  const existing = await db.decks.orderBy('createdAt').first()
  if (existing) return existing
  return createDeck({ name: DEFAULT_DECK_NAME })
}

function applyDeckFields(
  deck: Deck,
  {
    name,
    description,
    image,
    color,
  }: {
    name: string
    description?: string
    image?: Blob | File | null
    color?: string
  },
): Deck {
  const next: Deck = {
    ...deck,
    name: name.trim(),
  }

  if (description !== undefined) {
    const trimmed = description.trim()
    if (trimmed) next.description = trimmed
    else delete next.description
  }

  if (image === null) {
    delete next.image
  } else if (image instanceof Blob) {
    next.image = image
  }

  if (color !== undefined) {
    next.color = normalizeHexColor(color)
  } else if (!next.color) {
    next.color = DEFAULT_DECK_COLOR
  }

  return next
}

async function createDeck({
  name,
  description,
  image,
  color,
}: CreateDeckInput): Promise<Deck> {
  const deck = applyDeckFields(
    {
      id: crypto.randomUUID(),
      name: '',
      createdAt: Date.now(),
    },
    { name, description, image, color },
  )
  await db.decks.add(deck)
  return deck
}

async function updateDeck({
  id,
  name,
  description,
  image,
  color,
}: UpdateDeckInput): Promise<Deck> {
  const existing = await db.decks.get(id)
  if (!existing) throw new Error('Deck not found')

  const next = applyDeckFields(existing, { name, description, image, color })
  await db.decks.put(next)
  return next
}

async function deleteDeck(deckId: string): Promise<void> {
  await db.transaction('rw', db.decks, db.cards, async () => {
    const cardIds = await db.cards.where('deckId').equals(deckId).primaryKeys()
    if (cardIds.length > 0) {
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
  const fsrs = createNewFSRSCard()

  const card: Card = {
    id: crypto.randomUUID(),
    deckId: deck.id,
    front: front.trim(),
    back: back.trim(),
    createdAt: Date.now(),
    ...fsrs,
    ...(romaji?.trim() ? { romaji: romaji.trim() } : {}),
    ...(example?.trim() ? { example: example.trim() } : {}),
    ...(imageBlob ? { image: imageBlob } : {}),
  }

  await db.cards.add(card)
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

async function assignCardToDeck(cardId: string, deckId: string): Promise<Card> {
  const existing = await db.cards.get(cardId)
  if (!existing) throw new Error('Card not found')
  const deck = await db.decks.get(deckId)
  if (!deck) throw new Error('Deck not found')

  const next: Card = { ...existing, deckId }
  await db.cards.put(next)
  return next
}

async function deleteCard(cardId: string): Promise<void> {
  await db.cards.delete(cardId)
}

async function resetCardProgress(cardId: string): Promise<Card> {
  const existing = await db.cards.get(cardId)
  if (!existing) throw new Error('Card not found')
  const next = hydrateCardWithFsrs(
    {
      id: existing.id,
      deckId: existing.deckId,
      front: existing.front,
      back: existing.back,
      createdAt: existing.createdAt,
      ...(existing.romaji ? { romaji: existing.romaji } : {}),
      ...(existing.example ? { example: existing.example } : {}),
      ...(existing.image ? { image: existing.image } : {}),
    },
    null,
  )
  await db.cards.put(next)
  return next
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

async function pageFromCards(
  cards: Card[],
  offset: number,
  limit: number,
): Promise<CardsPageResult> {
  const slice = cards.slice(offset, offset + limit)
  return {
    items: slice.map((card) => ({ card })),
    hasMore: offset + limit < cards.length,
  }
}

/**
 * Paginated cards from Dexie using offset/limit, with optional state, deck, and text filters.
 */
export async function getCardsPage({
  offset,
  limit,
  search = '',
  state = 'all',
  deckId,
}: CardsPageQuery): Promise<CardsPageResult> {
  const wantsSearch = search.trim().length > 0
  const wantsState = state !== 'all'
  const wantsDeck = Boolean(deckId)

  if (!wantsSearch && !wantsState && !wantsDeck) {
    const cards = await db.cards
      .orderBy('createdAt')
      .reverse()
      .offset(offset)
      .limit(limit + 1)
      .toArray()
    const page = cards.slice(0, limit)
    return {
      items: page.map((card) => ({ card })),
      hasMore: cards.length > limit,
    }
  }

  const newest = wantsDeck
    ? (await db.cards.where('deckId').equals(deckId!).sortBy('createdAt')).reverse()
    : await db.cards.orderBy('createdAt').reverse().toArray()

  if (!wantsSearch && !wantsState) {
    return pageFromCards(newest, offset, limit)
  }

  const matched: Card[] = []

  for (const card of newest) {
    if (!matchesSearch(card, search)) continue
    if (wantsState && !cardMatchesUiState(card, state)) continue
    matched.push(card)
  }

  return pageFromCards(matched, offset, limit)
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
    updateDeck,
    deleteDeck,
    addCard,
    updateCard,
    assignCardToDeck,
    deleteCard,
    resetCardProgress,
    getCardsByDeck,
    ensureDefaultDeck,
    getCardsPage,
  }
}

export {
  createDeck,
  updateDeck,
  deleteDeck,
  addCard,
  updateCard,
  assignCardToDeck,
  deleteCard,
  resetCardProgress,
  getCardsByDeck,
  ensureDefaultDeck,
}
