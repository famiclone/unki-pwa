export type StudyMode = 'classic' | 'hardcore'

/** Finite session sizes, or `'all'` for no cap. */
export type SessionBatchSize = 10 | 20 | 40 | 'all'

export const SESSION_BATCH_OPTIONS: SessionBatchSize[] = [10, 20, 40, 'all']
export const DEFAULT_SESSION_BATCH_SIZE: SessionBatchSize = 20

const BATCH_STORAGE_KEY = 'unki.sessionBatchSize'

export type StudyLocationState = {
  mode?: StudyMode
  batchSize?: SessionBatchSize
}

export function parseStudyMode(
  queryMode: string | null,
  stateMode?: unknown,
): StudyMode {
  if (queryMode === 'classic' || queryMode === 'hardcore') return queryMode
  if (stateMode === 'classic' || stateMode === 'hardcore') return stateMode
  return 'hardcore'
}

function normalizeBatchSize(value: unknown): SessionBatchSize | null {
  if (value === 'all' || value === 'All') return 'all'
  const n = typeof value === 'number' ? value : Number(value)
  if (n === 10 || n === 20 || n === 40) return n
  return null
}

export function getStoredSessionBatchSize(): SessionBatchSize {
  try {
    return (
      normalizeBatchSize(localStorage.getItem(BATCH_STORAGE_KEY)) ??
      DEFAULT_SESSION_BATCH_SIZE
    )
  } catch {
    return DEFAULT_SESSION_BATCH_SIZE
  }
}

export function persistSessionBatchSize(size: SessionBatchSize): void {
  try {
    localStorage.setItem(BATCH_STORAGE_KEY, String(size))
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Prefer router overrides, otherwise the Settings preference. */
export function parseSessionBatchSize(
  queryBatch: string | null,
  stateBatch?: unknown,
): SessionBatchSize {
  const fromQuery = normalizeBatchSize(queryBatch)
  if (fromQuery !== null) return fromQuery
  const fromState = normalizeBatchSize(stateBatch)
  if (fromState !== null) return fromState
  return getStoredSessionBatchSize()
}

/** Resolve batch size to a slice limit (`Infinity` = no cap). */
export function sessionBatchLimit(batchSize: SessionBatchSize): number {
  return batchSize === 'all' ? Number.POSITIVE_INFINITY : batchSize
}

export function sessionBatchLabel(size: SessionBatchSize): string {
  return size === 'all' ? 'All' : String(size)
}

/** Build a study URL with mode (and optional deck via query when not in the path). */
export function buildStudyHref(options: {
  mode: StudyMode
  deckId?: string | null
  /** Prefer `/decks/:id/study` when a deck is set. */
  useDeckPath?: boolean
}): string {
  const { mode, deckId, useDeckPath = true } = options
  const params = new URLSearchParams()
  params.set('mode', mode)

  if (deckId && useDeckPath) {
    return `/decks/${encodeURIComponent(deckId)}/study?${params.toString()}`
  }

  if (deckId) {
    params.set('deckId', deckId)
  }
  return `/study?${params.toString()}`
}
