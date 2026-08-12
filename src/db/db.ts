import Dexie, { type EntityTable } from 'dexie'

/** Vocabulary side of a card (e.g. Kanji from textbooks). */
export type CardFront = string

/** Optional pronunciation / reading (e.g. romaji or kana). */
export type CardRomaji = string

/** Translation / meaning side of a card. */
export type CardBack = string

export type ReviewState = 'new' | 'learning' | 'review'

export interface Deck {
  id: string
  name: string
  createdAt: number
}

export interface Card {
  id: string
  deckId: string
  /** Vocabulary (e.g. Kanji from textbooks). */
  front: CardFront
  /** Pronunciation / reading. */
  romaji?: CardRomaji
  /** Translation / meaning. */
  back: CardBack
  /** Optional image stored as a Blob in IndexedDB. */
  image?: Blob
  createdAt: number
}

export interface Review {
  cardId: string
  state: ReviewState
  /** Due date as a Unix timestamp (ms). */
  due: number
  stability: number
  difficulty: number
  reps: number
}

export type UnkiDB = Dexie & {
  decks: EntityTable<Deck, 'id'>
  cards: EntityTable<Card, 'id'>
  reviews: EntityTable<Review, 'cardId'>
}

export const db = new Dexie('UnkiDB') as UnkiDB

db.version(1).stores({
  // Blob fields (image) are stored on the record but not indexed.
  decks: 'id, name, createdAt',
  cards: 'id, deckId, front, romaji, back, createdAt',
  reviews: 'cardId, state, due, stability, difficulty, reps',
})
