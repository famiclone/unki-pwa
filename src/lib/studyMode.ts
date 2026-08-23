/** Finite session sizes, or `'all'` for no cap. */
export type SessionBatchSize = 10 | 20 | 40 | 'all'

export const SESSION_BATCH_OPTIONS: SessionBatchSize[] = [10, 20, 40, 'all']
export const DEFAULT_SESSION_BATCH_SIZE: SessionBatchSize = 20

const BATCH_STORAGE_KEY = 'unki.sessionBatchSize'

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

export function parseSessionBatchSize(queryBatch: string | null): SessionBatchSize {
  return normalizeBatchSize(queryBatch) ?? getStoredSessionBatchSize()
}

/** Resolve batch size to a slice limit (`Infinity` = no cap). */
export function sessionBatchLimit(batchSize: SessionBatchSize): number {
  return batchSize === 'all' ? Number.POSITIVE_INFINITY : batchSize
}

export function sessionBatchLabel(size: SessionBatchSize): string {
  return size === 'all' ? 'All' : String(size)
}

export function buildStudyHref(options?: { deckId?: string | null }): string {
  const deckId = options?.deckId
  if (deckId) {
    return `/decks/${encodeURIComponent(deckId)}/study`
  }
  return '/study'
}
