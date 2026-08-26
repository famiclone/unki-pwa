import JSZip from 'jszip'
import {
  db,
  hydrateCardWithFsrs,
  type Card,
  type DailyLog,
  type Deck,
  type Review,
  type Stats,
} from '@/db'
import { toLocalDateString } from '@/hooks/useStreak'

export const BACKUP_JSON_FILENAME = 'database.json' as const

export type BackupDeck = Omit<Deck, 'image'> & { imagePath?: string }
export type BackupCard = Omit<Card, 'image'> & { imagePath?: string }

export type BackupDatabase = {
  decks: BackupDeck[]
  cards: BackupCard[]
  /** Legacy SM-2 rows; optional in newer backups. */
  reviews: Review[]
  stats: Stats[]
  dailyLog: DailyLog[]
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

function stripImageToPath<T extends { id: string; image?: Blob }>(
  entity: T,
  prefix: 'deck' | 'card',
  imgFolder: JSZip,
): Omit<T, 'image'> & { imagePath?: string } {
  const { image, ...rest } = entity
  if (!image) return rest

  const ext = extensionForMime(image.type || '')
  const filename = `${prefix}_${entity.id}.${ext}`
  const imagePath = `images/${filename}`
  imgFolder.file(filename, image)
  return { ...rest, imagePath }
}

function downloadZipBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function parseBackupDatabase(raw: unknown): BackupDatabase {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file: database.json is malformed')
  }

  const data = raw as Record<string, unknown>
  const required = ['decks', 'cards', 'stats', 'dailyLog'] as const

  for (const key of required) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Invalid backup file: "${key}" must be an array`)
    }
  }

  return {
    decks: data.decks as BackupDeck[],
    cards: data.cards as BackupCard[],
    reviews: Array.isArray(data.reviews) ? (data.reviews as Review[]) : [],
    stats: data.stats as Stats[],
    dailyLog: data.dailyLog as DailyLog[],
  }
}

async function restoreImageFromZip<T extends { imagePath?: string }>(
  zip: JSZip,
  item: T,
): Promise<Omit<T, 'imagePath'> & { image?: Blob }> {
  const { imagePath, ...rest } = item
  if (!imagePath) return rest

  const imgFile = zip.file(imagePath)
  if (!imgFile) {
    throw new Error(`Backup is missing image file: ${imagePath}`)
  }

  const blob = await imgFile.async('blob')
  return { ...rest, image: blob }
}

async function prepareRestorePayload(
  zip: JSZip,
  parsed: BackupDatabase,
): Promise<{
  decks: Deck[]
  cards: Card[]
  stats: Stats[]
  dailyLog: DailyLog[]
}> {
  const [decks, restoredCards] = await Promise.all([
    Promise.all(parsed.decks.map((deck) => restoreImageFromZip(zip, deck))),
    Promise.all(parsed.cards.map((card) => restoreImageFromZip(zip, card))),
  ])

  const reviewById = new Map(
    parsed.reviews.map((review) => [review.cardId, review]),
  )

  const cards = restoredCards.map((card) =>
    hydrateCardWithFsrs(card, reviewById.get(card.id) ?? null),
  )

  return {
    decks,
    cards,
    stats: parsed.stats,
    dailyLog: parsed.dailyLog,
  }
}

async function replaceDatabaseTables(payload: {
  decks: Deck[]
  cards: Card[]
  stats: Stats[]
  dailyLog: DailyLog[]
}): Promise<void> {
  await db.transaction(
    'rw',
    [db.decks, db.cards, db.reviews, db.stats, db.dailyLog],
    async () => {
      await Promise.all([
        db.decks.clear(),
        db.cards.clear(),
        db.reviews.clear(),
        db.stats.clear(),
        db.dailyLog.clear(),
      ])

      await Promise.all([
        payload.decks.length > 0 ? db.decks.bulkAdd(payload.decks) : Promise.resolve(),
        payload.cards.length > 0 ? db.cards.bulkAdd(payload.cards) : Promise.resolve(),
        payload.stats.length > 0 ? db.stats.bulkAdd(payload.stats) : Promise.resolve(),
        payload.dailyLog.length > 0
          ? db.dailyLog.bulkAdd(payload.dailyLog)
          : Promise.resolve(),
      ])
    },
  )
}

/** Restore the full database from an exported backup zip. */
export async function importFullBackup(file: File): Promise<void> {
  const zip = await JSZip.loadAsync(file)

  const jsonEntry = zip.file(BACKUP_JSON_FILENAME)
  if (!jsonEntry) {
    throw new Error('Invalid backup file: database.json not found')
  }

  const jsonText = await jsonEntry.async('string')
  let parsedRaw: unknown
  try {
    parsedRaw = JSON.parse(jsonText)
  } catch {
    throw new Error('Invalid backup file: database.json is not valid JSON')
  }

  const parsed = parseBackupDatabase(parsedRaw)
  const payload = await prepareRestorePayload(zip, parsed)
  await replaceDatabaseTables(payload)
}

/** Export every Dexie table and blob images into a downloadable backup zip. */
export async function exportFullBackup(): Promise<void> {
  const [decks, cards, stats, dailyLog] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.stats.toArray(),
    db.dailyLog.toArray(),
  ])

  const zip = new JSZip()
  const imgFolder = zip.folder('images')
  if (!imgFolder) {
    throw new Error('Could not create images folder in zip')
  }

  const payload: BackupDatabase = {
    decks: decks.map((deck) => stripImageToPath(deck, 'deck', imgFolder)),
    cards: cards.map((card) => stripImageToPath(card, 'card', imgFolder)),
    reviews: [],
    stats,
    dailyLog,
  }

  zip.file(BACKUP_JSON_FILENAME, JSON.stringify(payload, null, 2))

  const content = await zip.generateAsync({ type: 'blob' })
  downloadZipBlob(content, `unki-backup-${toLocalDateString()}.zip`)
}
