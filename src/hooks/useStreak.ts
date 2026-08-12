import { useLiveQuery } from 'dexie-react-hooks'
import { db, GLOBAL_STATS_ID, type Stats } from '@/db/db'

/** Format a Date as local YYYY-MM-DD (never UTC). */
export function toLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Yesterday in local time as YYYY-MM-DD. */
export function toLocalYesterdayString(date = new Date()): string {
  const yesterday = new Date(date)
  yesterday.setDate(yesterday.getDate() - 1)
  return toLocalDateString(yesterday)
}

export function createDefaultStats(): Stats {
  return {
    id: GLOBAL_STATS_ID,
    currentStreak: 0,
    lastStudyDate: '',
  }
}

/**
 * Streak shown in the UI: active if last study was today or yesterday;
 * otherwise treat as broken (0) until the next review.
 */
export function getDisplayStreak(stats: Stats | null | undefined): number {
  if (!stats || stats.currentStreak <= 0 || !stats.lastStudyDate) return 0
  const today = toLocalDateString()
  const yesterday = toLocalYesterdayString()
  if (stats.lastStudyDate === today || stats.lastStudyDate === yesterday) {
    return stats.currentStreak
  }
  return 0
}

/**
 * Update the global streak after a successful card review rating.
 * Uses local calendar dates only.
 */
export async function updateStreak(now = new Date()): Promise<Stats> {
  const today = toLocalDateString(now)
  const yesterday = toLocalYesterdayString(now)
  const existing = (await db.stats.get(GLOBAL_STATS_ID)) ?? createDefaultStats()

  if (existing.lastStudyDate === today) {
    return existing
  }

  let currentStreak = 1
  if (existing.lastStudyDate === yesterday) {
    currentStreak = existing.currentStreak + 1
  }

  const next: Stats = {
    id: GLOBAL_STATS_ID,
    currentStreak,
    lastStudyDate: today,
  }

  await db.stats.put(next)
  return next
}

export async function getGlobalStats(): Promise<Stats> {
  return (await db.stats.get(GLOBAL_STATS_ID)) ?? createDefaultStats()
}

export async function putGlobalStats(stats: Omit<Stats, 'id'> | Stats): Promise<Stats> {
  const next: Stats = {
    id: GLOBAL_STATS_ID,
    currentStreak: Math.max(0, Math.floor(stats.currentStreak)),
    lastStudyDate:
      typeof stats.lastStudyDate === 'string' ? stats.lastStudyDate : '',
  }
  await db.stats.put(next)
  return next
}

export function useStreak() {
  const stats = useLiveQuery(() => getGlobalStats(), [])
  const displayStreak = getDisplayStreak(stats)

  return {
    stats: stats ?? createDefaultStats(),
    streak: displayStreak,
    isActive: displayStreak > 0,
    loading: stats === undefined,
    updateStreak,
  }
}
