export const ALL_DECKS_VALUE = 'all' as const

const DECK_FILTER_STORAGE_KEY = 'unki.hubDeckFilter'

export function getStoredDeckFilter(): string {
  try {
    const value = localStorage.getItem(DECK_FILTER_STORAGE_KEY)
    return value && value.length > 0 ? value : ALL_DECKS_VALUE
  } catch {
    return ALL_DECKS_VALUE
  }
}

export function persistDeckFilter(value: string): void {
  try {
    localStorage.setItem(DECK_FILTER_STORAGE_KEY, value)
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Drop stale deck ids when a deck was deleted. */
export function resolveDeckFilter(
  stored: string,
  deckIds: readonly string[],
): string {
  if (stored === ALL_DECKS_VALUE) return ALL_DECKS_VALUE
  return deckIds.includes(stored) ? stored : ALL_DECKS_VALUE
}
