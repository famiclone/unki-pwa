import { useLiveQuery } from 'dexie-react-hooks'
import { db, GLOBAL_STATS_ID, type DailyLog, type Stats } from '@/db/db'
import {
  calculateLevelStats,
  expForReview,
  type ExpAward,
} from '@/lib/gamification'
import type { Grade } from '@/lib/srs'

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
    exp: 0,
    level: 1,
  }
}

export function normalizeStats(stats?: Partial<Stats> | null): Stats {
  const exp = Math.max(0, Math.floor(stats?.exp ?? 0))
  return {
    id: GLOBAL_STATS_ID,
    currentStreak: Math.max(0, Math.floor(stats?.currentStreak ?? 0)),
    lastStudyDate:
      typeof stats?.lastStudyDate === 'string' ? stats.lastStudyDate : '',
    exp,
    level: calculateLevelStats(exp).currentLevel,
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
  const existing = normalizeStats(await db.stats.get(GLOBAL_STATS_ID))

  if (existing.lastStudyDate === today) {
    return existing
  }

  let currentStreak = 1
  if (existing.lastStudyDate === yesterday) {
    currentStreak = existing.currentStreak + 1
  }

  const next = normalizeStats({
    ...existing,
    currentStreak,
    lastStudyDate: today,
  })

  await db.stats.put(next)
  return next
}

/** Increment today's dailyLog after a card rating. Creates the row if missing. */
export async function logDailyReview(now = new Date()): Promise<DailyLog> {
  const today = toLocalDateString(now)
  const existing = await db.dailyLog.get(today)
  const next: DailyLog = {
    id: today,
    cardsReviewed: (existing?.cardsReviewed ?? 0) + 1,
    didStudy: true,
  }
  await db.dailyLog.put(next)
  return next
}

/** Record a review: keep the streak, then log the day's activity. */
export async function recordStudyActivity(now = new Date()): Promise<void> {
  await updateStreak(now)
  await logDailyReview(now)
}

export async function getGlobalStats(): Promise<Stats> {
  return normalizeStats(await db.stats.get(GLOBAL_STATS_ID))
}

export async function putGlobalStats(stats: Omit<Stats, 'id'> | Stats): Promise<Stats> {
  const next = normalizeStats(stats)
  await db.stats.put(next)
  return next
}

/** Add EXP for a rated card and persist the derived level. */
export async function awardReviewExp(
  grade: Grade,
  wasNew: boolean,
): Promise<ExpAward> {
  const existing = await getGlobalStats()
  const previousLevel = existing.level
  const expGained = expForReview(grade, wasNew)
  const totalExp = existing.exp + expGained
  const { currentLevel } = calculateLevelStats(totalExp)
  const next = normalizeStats({
    ...existing,
    exp: totalExp,
    level: currentLevel,
  })
  await db.stats.put(next)
  return {
    expGained,
    previousLevel,
    newLevel: currentLevel,
    totalExp,
    leveledUp: currentLevel > previousLevel,
  }
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
    logDailyReview,
    recordStudyActivity,
  }
}
