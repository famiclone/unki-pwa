#!/usr/bin/env node
/**
 * Convert an Anki .apkg archive into an Unki PWA zip (deck.json + images/).
 *
 * Usage:
 *   npm run convert:anki -- <input.apkg> [output.zip]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

const DECK_EXPORT_VERSION = 2
const DEFAULT_DECK_COLOR = '#1faf7f'
const FIELD_SEP = '\x1f'

const FRONT_NAMES = /^(front|expression|word|kanji|vocab|vocabulary|question|hanzi|character|term)$/i
const ROMAJI_NAMES =
  /^(romaji|reading|kana|furigana|pronunciation|pinyin|kana reading|word reading)$/i
const BACK_NAMES = /^(back|meaning|translation|english|definition|answer|gloss)$/i
const EXAMPLE_NAMES = /^(example|sentence|sample|example sentence)$/i

function usage(exitCode = 1) {
  console.error('Usage: npm run convert:anki -- <input.apkg> [output.zip]')
  process.exit(exitCode)
}

function sanitizeFilename(name) {
  const cleaned = name.trim().replace(/[^\w\-]+/g, '_').replace(/_+/g, '_')
  return cleaned.slice(0, 60) || 'deck'
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanAnkiText(raw) {
  return stripHtml(
    String(raw ?? '')
      .replace(/\[sound:[^\]]+\]/gi, '')
      .replace(/\{\{c\d+::([^:}]+)(?:::[^}]+)?\}\}/g, '$1'),
  )
}

function extractImageSrcs(html) {
  const srcs = []
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let match
  while ((match = re.exec(html))) {
    try {
      srcs.push(decodeURIComponent(match[1]).replace(/^.*[\\/]/, ''))
    } catch {
      srcs.push(match[1])
    }
  }
  return srcs
}

function parseJsonColumn(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function fieldNamesForModel(model) {
  const flds = Array.isArray(model?.flds) ? model.flds : []
  return flds
    .slice()
    .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))
    .map((field) => String(field.name ?? ''))
}

function pickField(fields, names, matcher) {
  const index = names.findIndex((name) => matcher.test(name))
  if (index === -1) return undefined
  const value = fields[index]
  return value ? cleanAnkiText(value) : undefined
}

/**
 * Map Anki note fields (\\x1f-separated) onto Unki Card: front / romaji / back / example.
 */
function mapFields(flds, fieldNames) {
  const fields = String(flds ?? '').split(FIELD_SEP)
  const names = fieldNames.length === fields.length ? fieldNames : []

  if (names.length > 0) {
    const front =
      pickField(fields, names, FRONT_NAMES) || cleanAnkiText(fields[0] ?? '')
    const romaji = pickField(fields, names, ROMAJI_NAMES)
    const back =
      pickField(fields, names, BACK_NAMES) ||
      cleanAnkiText(fields.find((value, i) => i > 0 && cleanAnkiText(value)) ?? '')
    const example = pickField(fields, names, EXAMPLE_NAMES)
    return { front, romaji, back, example }
  }

  const cleaned = fields.map(cleanAnkiText)
  if (cleaned.length <= 2) {
    return { front: cleaned[0] ?? '', back: cleaned[1] ?? '' }
  }
  if (cleaned.length === 3) {
    return { front: cleaned[0], romaji: cleaned[1], back: cleaned[2] }
  }
  return {
    front: cleaned[0],
    romaji: cleaned[1],
    back: cleaned[2],
    example: cleaned.slice(3).filter(Boolean).join('\n'),
  }
}

function firstImageFromFields(flds) {
  const fields = String(flds ?? '').split(FIELD_SEP)
  for (const field of fields) {
    const srcs = extractImageSrcs(field)
    if (srcs[0]) return srcs[0]
  }
  return undefined
}

function loadMediaMap(extractDir) {
  const mediaPath = path.join(extractDir, 'media')
  if (!fs.existsSync(mediaPath)) return new Map()
  const raw = parseJsonColumn(fs.readFileSync(mediaPath, 'utf8'), {})
  /** @type {Map<string, string>} filename -> zip entry name ("0", "1", …) */
  const byName = new Map()
  for (const [index, filename] of Object.entries(raw)) {
    if (typeof filename === 'string' && filename) {
      byName.set(filename, String(index))
      byName.set(path.basename(filename), String(index))
    }
  }
  return byName
}

function findCollectionDb(extractDir) {
  for (const name of ['collection.anki21', 'collection.anki2']) {
    const candidate = path.join(extractDir, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function pickDeckName(decks, did) {
  const deck = decks[String(did)]
  const name = typeof deck?.name === 'string' ? deck.name.trim() : ''
  if (name && name !== 'Default') return name.replace(/::/g, ' / ')
  const real = Object.values(decks).find(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      typeof entry.name === 'string' &&
      entry.name !== 'Default' &&
      entry.id !== 1,
  )
  if (real?.name) return String(real.name).replace(/::/g, ' / ')
  return 'Imported Anki deck'
}

function convertApkg(inputPath, outputPath) {
  const absInput = path.resolve(inputPath)
  if (!fs.existsSync(absInput)) {
    throw new Error(`File not found: ${absInput}`)
  }

  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-convert-'))
  const outZip = new AdmZip()

  try {
    new AdmZip(absInput).extractAllTo(extractDir, true)

    const dbPath = findCollectionDb(extractDir)
    if (!dbPath) {
      throw new Error('Invalid .apkg: missing collection.anki2 / collection.anki21')
    }

    const sqlite = new Database(dbPath, { readonly: true, fileMustExist: true })
    const col = sqlite.prepare('SELECT decks, models, crt FROM col LIMIT 1').get()
    if (!col) {
      throw new Error('Invalid Anki collection: empty col table')
    }

    const decks = parseJsonColumn(col.decks, {})
    const models = parseJsonColumn(col.models, {})
    const mediaMap = loadMediaMap(extractDir)

    const notes = sqlite
      .prepare(
        `SELECT n.id, n.mid, n.flds, n.mod, MIN(c.did) AS did
         FROM notes n
         JOIN cards c ON c.nid = n.id
         GROUP BY n.id
         ORDER BY n.id`,
      )
      .all()

    sqlite.close()

    if (notes.length === 0) {
      throw new Error('No notes found in this .apkg')
    }

    const imagesDir = 'images'
    /** @type {Map<string, string>} original filename -> zip path */
    const copiedImages = new Map()
    const cards = []
    const didCounts = new Map()

    for (const note of notes) {
      const model = models[String(note.mid)] ?? {}
      const mapped = mapFields(note.flds, fieldNamesForModel(model))
      if (!mapped.front && !mapped.back) continue

      didCounts.set(note.did, (didCounts.get(note.did) ?? 0) + 1)

      /** @type {{ front: string, back: string, createdAt: number, romaji?: string, example?: string, image?: string }} */
      const card = {
        front: mapped.front || mapped.back,
        back: mapped.back || mapped.front,
        createdAt:
          typeof note.id === 'number' && note.id > 1e12 ? note.id : (note.mod ?? 0) * 1000,
      }
      if (mapped.romaji) card.romaji = mapped.romaji
      if (mapped.example) card.example = mapped.example

      const imageName = firstImageFromFields(note.flds)
      if (imageName) {
        let imagePath = copiedImages.get(imageName)
        if (!imagePath) {
          const entry = mediaMap.get(imageName) ?? mediaMap.get(path.basename(imageName))
          const srcFile = entry ? path.join(extractDir, entry) : null
          if (srcFile && fs.existsSync(srcFile)) {
            const ext = path.extname(imageName) || path.extname(srcFile) || '.bin'
            imagePath = `${imagesDir}/${uuidv4()}${ext}`
            outZip.addFile(imagePath, fs.readFileSync(srcFile))
            copiedImages.set(imageName, imagePath)
          }
        }
        if (imagePath) card.image = imagePath
      }

      cards.push(card)
    }

    if (cards.length === 0) {
      throw new Error('No convertible notes (front/back were empty after cleaning)')
    }

    const topDid = [...didCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const deckName = pickDeckName(decks, topDid)
    const createdAt =
      typeof col.crt === 'number' && col.crt > 0 ? col.crt * 1000 : Date.now()

    const payload = {
      version: DECK_EXPORT_VERSION,
      deck: {
        name: deckName,
        createdAt,
        color: DEFAULT_DECK_COLOR,
      },
      cards,
    }

    outZip.addFile('deck.json', Buffer.from(JSON.stringify(payload, null, 2), 'utf8'))

    const absOutput = path.resolve(
      outputPath ?? `${sanitizeFilename(deckName)}.unki.zip`,
    )
    outZip.writeZip(absOutput)

    console.log(`Converted ${cards.length} card(s) → ${absOutput}`)
    if (copiedImages.size > 0) {
      console.log(`Packed ${copiedImages.size} image(s)`)
    }
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true })
  }
}

function main() {
  const argv = process.argv.slice(2).filter((arg) => arg !== '--')
  if (argv.includes('-h') || argv.includes('--help')) usage(0)
  const [input, output] = argv
  if (!input) usage(1)

  try {
    convertApkg(input, output)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main()
}
