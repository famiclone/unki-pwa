import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { createInitialSrsStats, srsStatsToReview } from '../lib/srs'
import { db, type Card, type Deck, type DailyLog, type Stats } from './db'
import { getGlobalStats, putGlobalStats } from '@/hooks/useStreak'
import { DEFAULT_DECK_COLOR, normalizeHexColor } from '@/lib/colorUtils'

export const DECK_EXPORT_VERSION = 2 as const

export type ExportedCard = {
  front: string
  romaji?: string
  back: string
  example?: string
  createdAt: number
  /** Relative path inside the zip (e.g. images/abc.webp). */
  image?: string
}

export type ExportedStats = {
  currentStreak: number
  lastStudyDate: string
  exp?: number
  level?: number
  hearts?: number
  maxHearts?: number
  attack?: number
  defense?: number
  isExhausted?: boolean
  coins?: number
}

export type ExportedDailyLog = {
  id: string
  cardsReviewed: number
  didStudy: boolean
}

export type ExportedDeckJson = {
  version: 1 | typeof DECK_EXPORT_VERSION
  deck: {
    name: string
    createdAt: number
    description?: string
    /** Accent color as a hex code. */
    color?: string
    /** Relative path inside the zip (e.g. images/deck.webp). */
    image?: string
  }
  cards: ExportedCard[]
  /** Global streak stats (export v2+). */
  stats?: ExportedStats
  /** Daily review log for the week chart. */
  dailyLog?: ExportedDailyLog[]
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'bin'
  }
}

function sanitizeFilename(name: string): string {
  const cleaned = name.trim().replace(/[^\w\-]+/g, '_').replace(/_+/g, '_')
  return cleaned.slice(0, 60) || 'deck'
}

function mimeFromExtension(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

async function readZipImage(zip: JSZip, path: string): Promise<Blob | undefined> {
  const imageFile = zip.file(path)
  if (!imageFile) return undefined
  const buffer = await imageFile.async('arraybuffer')
  return new Blob([buffer], { type: mimeFromExtension(path) })
}

type ZipDeckMeta = {
  name: string
  createdAt: number
  description?: string
  color?: string
  image?: Blob
}

async function buildCardsZip(
  cards: Card[],
  deckMeta: ZipDeckMeta,
  includeStats: boolean,
): Promise<Blob> {
  const zip = new JSZip()
  const imagesFolder = zip.folder('images')
  if (!imagesFolder) {
    throw new Error('Could not create images folder in zip')
  }

  let deckImagePath: string | undefined
  if (deckMeta.image) {
    const ext = extensionForMime(deckMeta.image.type || '')
    deckImagePath = `images/deck.${ext}`
    imagesFolder.file(`deck.${ext}`, deckMeta.image)
  }

  const exportedCards: ExportedCard[] = []

  for (const card of cards) {
    const entry: ExportedCard = {
      front: card.front,
      back: card.back,
      createdAt: card.createdAt,
      ...(card.romaji ? { romaji: card.romaji } : {}),
      ...(card.example ? { example: card.example } : {}),
    }

    if (card.image) {
      const ext = extensionForMime(card.image.type || '')
      const imagePath = `images/${card.id}.${ext}`
      imagesFolder.file(`${card.id}.${ext}`, card.image)
      entry.image = imagePath
    }

    exportedCards.push(entry)
  }

  const payload: ExportedDeckJson = {
    version: DECK_EXPORT_VERSION,
    deck: {
      name: deckMeta.name,
      createdAt: deckMeta.createdAt,
      ...(deckMeta.description ? { description: deckMeta.description } : {}),
      color: normalizeHexColor(deckMeta.color),
      ...(deckImagePath ? { image: deckImagePath } : {}),
    },
    cards: exportedCards,
  }

  if (includeStats) {
    const [stats, dailyLog] = await Promise.all([
      getGlobalStats(),
      db.dailyLog.toArray(),
    ])
    payload.stats = {
      currentStreak: stats.currentStreak,
      lastStudyDate: stats.lastStudyDate,
      exp: stats.exp,
      level: stats.level,
      hearts: stats.hearts,
      maxHearts: stats.maxHearts,
      attack: stats.attack,
      defense: stats.defense,
      isExhausted: stats.isExhausted,
      coins: stats.coins,
    }
    payload.dailyLog = dailyLog.map((entry) => ({
      id: entry.id,
      cardsReviewed: entry.cardsReviewed,
      didStudy: entry.didStudy,
    }))
  }

  zip.file('deck.json', JSON.stringify(payload, null, 2))
  return zip.generateAsync({ type: 'blob' })
}

/**
 * Fetch a deck, its cards, and images from Dexie; zip as deck.json + images; download.
 */
export async function exportDeck(deckId: string): Promise<void> {
  const deck = await db.decks.get(deckId)
  if (!deck) {
    throw new Error('Deck not found')
  }

  const cards = await db.cards.where('deckId').equals(deckId).sortBy('createdAt')
  const blob = await buildCardsZip(
    cards,
    {
      name: deck.name,
      createdAt: deck.createdAt,
      ...(deck.description ? { description: deck.description } : {}),
      color: deck.color,
      ...(deck.image ? { image: deck.image } : {}),
    },
    true,
  )
  saveAs(blob, `${sanitizeFilename(deck.name)}.unki.zip`)
}

/** Export every card in the database as a single archive. */
export async function exportAllCards(): Promise<void> {
  const cards = await db.cards.orderBy('createdAt').toArray()
  if (cards.length === 0) {
    throw new Error('No cards to export')
  }

  const blob = await buildCardsZip(
    cards,
    {
      name: 'All Cards',
      createdAt: Date.now(),
    },
    true,
  )
  saveAs(blob, 'unki-all-cards.unki.zip')
}

function isExportedDeckJson(value: unknown): value is ExportedDeckJson {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  if (data.version !== 1 && data.version !== DECK_EXPORT_VERSION) return false
  if (!data.deck || typeof data.deck !== 'object') return false
  const deck = data.deck as Record<string, unknown>
  if (typeof deck.name !== 'string') return false
  if (!Array.isArray(data.cards)) return false
  return true
}

function parseExportedStats(value: unknown): ExportedStats | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (typeof data.currentStreak !== 'number') return null
  if (typeof data.lastStudyDate !== 'string') return null
  return {
    currentStreak: data.currentStreak,
    lastStudyDate: data.lastStudyDate,
    ...(typeof data.exp === 'number' ? { exp: data.exp } : {}),
    ...(typeof data.level === 'number' ? { level: data.level } : {}),
    ...(typeof data.attack === 'number' ? { attack: data.attack } : {}),
    ...(typeof data.defense === 'number' ? { defense: data.defense } : {}),
    ...(typeof data.coins === 'number' ? { coins: data.coins } : {}),
  }
}

/**
 * Merge imported streak with the existing global record (keep the stronger streak).
 */
async function mergeImportedStats(incoming: ExportedStats): Promise<void> {
  const existing = await getGlobalStats()
  const next: Stats = {
    ...existing,
    exp: Math.max(existing.exp, Math.max(0, Math.floor(incoming.exp ?? 0))),
    coins: Math.max(existing.coins, Math.max(0, Math.floor(incoming.coins ?? 0))),
    defense: Math.max(
      existing.defense,
      Math.max(0, Math.floor(incoming.defense ?? 0)),
    ),
  }

  if (!existing.lastStudyDate && incoming.lastStudyDate) {
    next.currentStreak = Math.max(0, Math.floor(incoming.currentStreak))
    next.lastStudyDate = incoming.lastStudyDate
  } else if (
    incoming.lastStudyDate &&
    incoming.lastStudyDate >= existing.lastStudyDate &&
    incoming.currentStreak >= existing.currentStreak
  ) {
    next.currentStreak = Math.max(0, Math.floor(incoming.currentStreak))
    next.lastStudyDate = incoming.lastStudyDate
  } else if (
    incoming.lastStudyDate &&
    incoming.lastStudyDate > existing.lastStudyDate
  ) {
    next.currentStreak = Math.max(0, Math.floor(incoming.currentStreak))
    next.lastStudyDate = incoming.lastStudyDate
  }

  await putGlobalStats(next)
}

async function mergeImportedDailyLog(incoming: ExportedDailyLog[]): Promise<void> {
  for (const entry of incoming) {
    if (typeof entry?.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.id)) {
      continue
    }
    const existing = await db.dailyLog.get(entry.id)
    const cardsReviewed = Math.max(
      existing?.cardsReviewed ?? 0,
      Math.max(0, Math.floor(entry.cardsReviewed || 0)),
    )
    const next: DailyLog = {
      id: entry.id,
      cardsReviewed,
      didStudy: Boolean(existing?.didStudy || entry.didStudy || cardsReviewed > 0),
    }
    await db.dailyLog.put(next)
  }
}

/**
 * Read a .zip File with JSZip, parse deck.json, restore images, and bulk-add into Dexie.
 */
export async function importDeck(file: File): Promise<Deck> {
  const zip = await JSZip.loadAsync(file)
  const deckJsonFile = zip.file('deck.json')
  if (!deckJsonFile) {
    throw new Error('Invalid deck archive: missing deck.json')
  }

  const raw = JSON.parse(await deckJsonFile.async('string')) as unknown
  if (!isExportedDeckJson(raw)) {
    throw new Error('Invalid deck.json format')
  }

  const now = Date.now()
  let deckImage: Blob | undefined
  if (raw.deck.image && typeof raw.deck.image === 'string') {
    deckImage = await readZipImage(zip, raw.deck.image)
  }

  const importedDescription =
    typeof raw.deck.description === 'string' ? raw.deck.description.trim() : ''

  const importedColor =
    typeof raw.deck.color === 'string' ? raw.deck.color : DEFAULT_DECK_COLOR

  const newDeck: Deck = {
    id: crypto.randomUUID(),
    name: raw.deck.name.trim() || 'Imported deck',
    createdAt: now,
    color: normalizeHexColor(importedColor),
    ...(importedDescription ? { description: importedDescription } : {}),
    ...(deckImage ? { image: deckImage } : {}),
  }

  const cards: Card[] = []
  const reviews: ReturnType<typeof srsStatsToReview>[] = []

  for (const exported of raw.cards) {
    if (
      typeof exported?.front !== 'string' ||
      typeof exported?.back !== 'string'
    ) {
      continue
    }

    const image =
      exported.image && typeof exported.image === 'string'
        ? await readZipImage(zip, exported.image)
        : undefined

    const card: Card = {
      id: crypto.randomUUID(),
      deckId: newDeck.id,
      front: exported.front.trim(),
      back: exported.back.trim(),
      createdAt:
        typeof exported.createdAt === 'number' ? exported.createdAt : now,
      ...(exported.romaji?.trim() ? { romaji: exported.romaji.trim() } : {}),
      ...(typeof exported.example === 'string' && exported.example.trim()
        ? { example: exported.example.trim() }
        : {}),
      ...(image ? { image } : {}),
    }

    cards.push(card)
    reviews.push(srsStatsToReview(card.id, createInitialSrsStats(now)))
  }

  await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
    await db.decks.add(newDeck)
    if (cards.length > 0) {
      await db.cards.bulkAdd(cards)
      await db.reviews.bulkAdd(reviews)
    }
  })

  const importedStats = parseExportedStats(raw.stats)
  if (importedStats) {
    await mergeImportedStats(importedStats)
  }
  if (Array.isArray(raw.dailyLog)) {
    await mergeImportedDailyLog(raw.dailyLog)
  }

  return newDeck
}
