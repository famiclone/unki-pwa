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
  description?: string
  /** Optional cover image stored as a Blob in IndexedDB. */
  image?: Blob
  /** Accent color as a hex code (e.g. #1faf7f). */
  color?: string
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
  /** Longest consecutive-day study streak achieved. */
  maxStreak: number
  /** Local calendar date as YYYY-MM-DD. */
  lastStudyDate: string
  /** Lifetime experience points. */
  exp: number
  /** Derived level (starts at 1). */
  level: number
}

export interface DailyLog {
  /** Local calendar date as YYYY-MM-DD. */
  id: string
  cardsReviewed: number
  didStudy: boolean
}

export type UnkiDB = Dexie & {
  decks: EntityTable<Deck, 'id'>
  cards: EntityTable<Card, 'id'>
  reviews: EntityTable<Review, 'cardId'>
  stats: EntityTable<Stats, 'id'>
  dailyLog: EntityTable<DailyLog, 'id'>
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

// Per-day review log for the week chart (id = local YYYY-MM-DD).
db.version(4).stores({
  decks: 'id, name, createdAt',
  cards: 'id, deckId, front, romaji, back, example, createdAt',
  reviews: 'cardId, state, due, stability, difficulty, reps',
  stats: 'id, currentStreak, lastStudyDate',
  dailyLog: 'id, cardsReviewed, didStudy',
})

// Optional deck description and cover image (Blob fields remain unlisted).
db.version(5).stores({
  decks: 'id, name, description, createdAt',
  cards: 'id, deckId, front, romaji, back, example, createdAt',
  reviews: 'cardId, state, due, stability, difficulty, reps',
  stats: 'id, currentStreak, lastStudyDate',
  dailyLog: 'id, cardsReviewed, didStudy',
})

// Optional deck accent color (hex string).
db.version(6).stores({
  decks: 'id, name, description, color, createdAt',
  cards: 'id, deckId, front, romaji, back, example, createdAt',
  reviews: 'cardId, state, due, stability, difficulty, reps',
  stats: 'id, currentStreak, lastStudyDate',
  dailyLog: 'id, cardsReviewed, didStudy',
})

// RPG exp / level on the global stats row.
db.version(7)
  .stores({
    decks: 'id, name, description, color, createdAt',
    cards: 'id, deckId, front, romaji, back, example, createdAt',
    reviews: 'cardId, state, due, stability, difficulty, reps',
    stats: 'id, currentStreak, lastStudyDate, exp, level',
    dailyLog: 'id, cardsReviewed, didStudy',
  })
  .upgrade(async (tx) => {
    await tx
      .table('stats')
      .toCollection()
      .modify((row: { exp?: number; level?: number }) => {
        if (typeof row.exp !== 'number') row.exp = 0
        if (typeof row.level !== 'number') row.level = 1
      })
  })

// Core Integrity (HP), Attack, and Overload penalty state.
db.version(8)
  .stores({
    decks: 'id, name, description, color, createdAt',
    cards: 'id, deckId, front, romaji, back, example, createdAt',
    reviews: 'cardId, state, due, stability, difficulty, reps',
    stats: 'id, currentStreak, lastStudyDate, exp, level, hp, maxHp, attack, isOverloaded, recoveryCombo',
    dailyLog: 'id, cardsReviewed, didStudy',
  })
  .upgrade(async (tx) => {
    await tx
      .table('stats')
      .toCollection()
      .modify(
        (row: {
          level?: number
          hp?: number
          maxHp?: number
          attack?: number
          isOverloaded?: boolean
          recoveryCombo?: number
        }) => {
          const level = typeof row.level === 'number' ? row.level : 1
          const maxHp = 100 + level * 5
          const attack = Math.floor(level / 3)
          if (typeof row.maxHp !== 'number') row.maxHp = maxHp
          if (typeof row.attack !== 'number') row.attack = attack
          if (typeof row.hp !== 'number') row.hp = maxHp
          if (typeof row.isOverloaded !== 'boolean') row.isOverloaded = false
          if (typeof row.recoveryCombo !== 'number') row.recoveryCombo = 0
        },
      )
  })

// Classic RPG hearts replace numeric HP / overload.
db.version(9)
  .stores({
    decks: 'id, name, description, color, createdAt',
    cards: 'id, deckId, front, romaji, back, example, createdAt',
    reviews: 'cardId, state, due, stability, difficulty, reps',
    stats: 'id, currentStreak, lastStudyDate, exp, level, hearts, maxHearts, attack, isExhausted',
    dailyLog: 'id, cardsReviewed, didStudy',
  })
  .upgrade(async (tx) => {
    await tx
      .table('stats')
      .toCollection()
      .modify(
        (row: {
          level?: number
          hp?: number
          maxHp?: number
          isOverloaded?: boolean
          hearts?: number
          maxHearts?: number
          attack?: number
          isExhausted?: boolean
        }) => {
          const level = typeof row.level === 'number' ? row.level : 1
          const maxHearts = 3 + Math.floor(level / 10)
          const attack = Math.floor(level / 3)
          row.maxHearts = maxHearts
          row.attack = attack
          if (typeof row.hearts !== 'number') {
            if (row.isOverloaded || (typeof row.hp === 'number' && row.hp <= 0)) {
              row.hearts = 0
            } else if (typeof row.hp === 'number' && typeof row.maxHp === 'number' && row.maxHp > 0) {
              const ratio = Math.max(0, Math.min(1, row.hp / row.maxHp))
              row.hearts = Math.round(ratio * maxHearts * 2) / 2
            } else {
              row.hearts = maxHearts
            }
          }
          row.isExhausted = row.hearts <= 0
        },
      )
  })

// Coins on global stats + inventory stacks (id UUID, keyed by itemId).
db.version(10)
  .stores({
    decks: 'id, name, description, color, createdAt',
    cards: 'id, deckId, front, romaji, back, example, createdAt',
    reviews: 'cardId, state, due, stability, difficulty, reps',
    stats:
      'id, currentStreak, lastStudyDate, exp, level, hearts, maxHearts, attack, isExhausted, coins',
    dailyLog: 'id, cardsReviewed, didStudy',
    inventory: 'id, itemId',
  })
  .upgrade(async (tx) => {
    await tx
      .table('stats')
      .toCollection()
      .modify((row: { coins?: number }) => {
        if (typeof row.coins !== 'number') row.coins = 0
      })
  })

// Unique trinkets store name/description/value on the inventory row (unindexed).
db.version(11).stores({
  decks: 'id, name, description, color, createdAt',
  cards: 'id, deckId, front, romaji, back, example, createdAt',
  reviews: 'cardId, state, due, stability, difficulty, reps',
  stats:
    'id, currentStreak, lastStudyDate, exp, level, hearts, maxHearts, attack, isExhausted, coins',
  dailyLog: 'id, cardsReviewed, didStudy',
  inventory: 'id, itemId',
})

// Flat Defense on global stats (defaults to 0).
db.version(12)
  .stores({
    decks: 'id, name, description, color, createdAt',
    cards: 'id, deckId, front, romaji, back, example, createdAt',
    reviews: 'cardId, state, due, stability, difficulty, reps',
    stats:
      'id, currentStreak, lastStudyDate, exp, level, hearts, maxHearts, attack, defense, isExhausted, coins',
    dailyLog: 'id, cardsReviewed, didStudy',
    inventory: 'id, itemId',
  })
  .upgrade(async (tx) => {
    await tx
      .table('stats')
      .toCollection()
      .modify((row: { defense?: number }) => {
        if (typeof row.defense !== 'number') row.defense = 0
      })
  })

// Drop inventory and combat stats; keep streak + EXP/level only.
db.version(13)
  .stores({
    decks: 'id, name, description, color, createdAt',
    cards: 'id, deckId, front, romaji, back, example, createdAt',
    reviews: 'cardId, state, due, stability, difficulty, reps',
    stats: 'id, currentStreak, lastStudyDate, exp, level',
    dailyLog: 'id, cardsReviewed, didStudy',
    inventory: null,
  })
  .upgrade(async (tx) => {
    await tx
      .table('stats')
      .toCollection()
      .modify(
        (
          row: Stats & {
            hearts?: number
            maxHearts?: number
            attack?: number
            defense?: number
            isExhausted?: boolean
            coins?: number
          },
        ) => {
          delete row.hearts
          delete row.maxHearts
          delete row.attack
          delete row.defense
          delete row.isExhausted
          delete row.coins
          if (typeof row.exp !== 'number') row.exp = 0
          if (typeof row.level !== 'number') row.level = 1
        },
      )
  })

// Longest study streak for statistics.
db.version(14)
  .stores({
    decks: 'id, name, description, color, createdAt',
    cards: 'id, deckId, front, romaji, back, example, createdAt',
    reviews: 'cardId, state, due, stability, difficulty, reps',
    stats: 'id, currentStreak, maxStreak, lastStudyDate, exp, level',
    dailyLog: 'id, cardsReviewed, didStudy',
  })
  .upgrade(async (tx) => {
    await tx
      .table('stats')
      .toCollection()
      .modify((row: Stats & { maxStreak?: number }) => {
        if (typeof row.maxStreak !== 'number') {
          row.maxStreak = Math.max(0, Math.floor(row.currentStreak ?? 0))
        }
      })
  })
