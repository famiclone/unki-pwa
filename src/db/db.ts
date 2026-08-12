import Dexie, { type EntityTable } from 'dexie'

/** Vocabulary side of a card (e.g. Kanji from textbooks). */
export type CardFront = string

/** Optional pronunciation / reading (e.g. romaji or kana). */
export type CardRomaji = string

/** Translation / meaning side of a card. */
export type CardBack = string

export type ReviewState = 'new' | 'learning' | 'review'

export const GLOBAL_STATS_ID = 'global' as const

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
  /** Optional example sentence. */
  example?: string
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

export interface Stats {
  id: typeof GLOBAL_STATS_ID | string
  currentStreak: number
  /** Local calendar date as YYYY-MM-DD. */
  lastStudyDate: string
}

export type UnkiDB = Dexie & {
  decks: EntityTable<Deck, 'id'>
  cards: EntityTable<Card, 'id'>
  reviews: EntityTable<Review, 'cardId'>
  stats: EntityTable<Stats, 'id'>
}

export const db = new Dexie('UnkiDB') as UnkiDB

db.version(1).stores({
  decks: 'id, name, createdAt',
  cards: 'id, deckId, front, romaji, back, createdAt',
  reviews: 'cardId, state, due, stability, difficulty, reps',
})

// Add optional example sentence on cards (non-indexed Blob fields remain unlisted).
db.version(2).stores({
  decks: 'id, name, createdAt',
  cards: 'id, deckId, front, romaji, back, example, createdAt',
  reviews: 'cardId, state, due, stability, difficulty, reps',
})

// Global streak / study stats (single row id: 'global').
db.version(3).stores({
  decks: 'id, name, createdAt',
  cards: 'id, deckId, front, romaji, back, example, createdAt',
  reviews: 'cardId, state, due, stability, difficulty, reps',
  stats: 'id, currentStreak, lastStudyDate',
})
