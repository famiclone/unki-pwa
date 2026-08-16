import { useLiveQuery } from 'dexie-react-hooks'
import { db, GLOBAL_STATS_ID, type DailyLog, type Stats } from '@/db/db'
import {
  againDamage,
  calculateLevelStats,
  coinsForReview,
  deriveCombatStats,
  snapHearts,
  totalExpForReview,
  type CombatResult,
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
  const { attack, maxHearts } = deriveCombatStats(1)
  return {
    id: GLOBAL_STATS_ID,
    currentStreak: 0,
    lastStudyDate: '',
    exp: 0,
    level: 1,
    hearts: maxHearts,
    maxHearts,
    attack,
    defense: 0,
    isExhausted: false,
    coins: 0,
  }
}

export function normalizeStats(stats?: Partial<Stats> | null): Stats {
  const exp = Math.max(0, Math.floor(stats?.exp ?? 0))
  const level = calculateLevelStats(exp).currentLevel
  const { attack, maxHearts } = deriveCombatStats(level)
  const rawHearts =
    typeof stats?.hearts === 'number' ? stats.hearts : maxHearts
  const hearts = Math.min(maxHearts, Math.max(0, snapHearts(rawHearts)))
  return {
    id: GLOBAL_STATS_ID,
    currentStreak: Math.max(0, Math.floor(stats?.currentStreak ?? 0)),
    lastStudyDate:
      typeof stats?.lastStudyDate === 'string' ? stats.lastStudyDate : '',
    exp,
    level,
    maxHearts,
    attack,
    defense: Math.max(0, Math.floor(stats?.defense ?? 0)),
    hearts,
    isExhausted: hearts <= 0,
    coins: Math.max(0, Math.floor(stats?.coins ?? 0)),
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

export type AwardReviewOptions = {
  /** Bank EXP/coins for a dungeon run; still persist heart damage. */
  deferRewards?: boolean
}

/** Apply review combat. EXP/coins persist unless `deferRewards` is set. */
export async function awardReviewExp(
  grade: Grade,
  wasNew: boolean,
  options: AwardReviewOptions = {},
): Promise<CombatResult> {
  const existing = await getGlobalStats()
  const previousLevel = existing.level
  const expGained = totalExpForReview(
    grade,
    wasNew,
    existing.attack,
    existing.isExhausted,
  )
  const coinsGained = coinsForReview(grade)
  const persistRewards = !options.deferRewards
  const totalExp = persistRewards ? existing.exp + expGained : existing.exp
  const { currentLevel } = calculateLevelStats(totalExp)
  const { attack, maxHearts } = deriveCombatStats(currentLevel)

  let hearts = existing.hearts
  let becameExhausted = false
  let heartsLost = 0
  let damageShielded = false

  if (grade === 1) {
    const damage = againDamage(existing.defense)
    heartsLost = damage
    damageShielded = existing.defense > 0
    hearts = Math.max(0, snapHearts(hearts - damage))
    if (hearts <= 0 && !existing.isExhausted) becameExhausted = true
  }

  const next = normalizeStats({
    ...existing,
    exp: totalExp,
    level: currentLevel,
    hearts,
    maxHearts,
    attack,
    defense: existing.defense,
    coins: persistRewards ? existing.coins + coinsGained : existing.coins,
  })
  await db.stats.put(next)
  return {
    expGained,
    previousLevel,
    newLevel: persistRewards ? currentLevel : previousLevel,
    totalExp: persistRewards ? totalExp : existing.exp + expGained,
    leveledUp: persistRewards && currentLevel > previousLevel,
    hearts: next.hearts,
    maxHearts: next.maxHearts,
    attack: next.attack,
    defense: next.defense,
    isExhausted: next.isExhausted,
    becameExhausted,
    recovered: existing.isExhausted && next.hearts > 0,
    coins: persistRewards ? next.coins : existing.coins + coinsGained,
    coinsGained,
    heartsLost,
    damageShielded,
  }
}

/** Persist banked dungeon-run EXP and coins, then derive level / combat. */
export async function commitRunRewards(
  exp: number,
  coins: number,
): Promise<CombatResult> {
  const existing = await getGlobalStats()
  const previousLevel = existing.level
  const expGained = Math.max(0, Math.floor(exp))
  const coinsGained = Math.max(0, Math.floor(coins))
  const totalExp = existing.exp + expGained
  const { currentLevel } = calculateLevelStats(totalExp)
  const { attack, maxHearts } = deriveCombatStats(currentLevel)
  const next = normalizeStats({
    ...existing,
    exp: totalExp,
    level: currentLevel,
    maxHearts,
    attack,
    coins: existing.coins + coinsGained,
  })
  await db.stats.put(next)
  return {
    expGained,
    previousLevel,
    newLevel: currentLevel,
    totalExp,
    leveledUp: currentLevel > previousLevel,
    hearts: next.hearts,
    maxHearts: next.maxHearts,
    attack: next.attack,
    defense: next.defense,
    isExhausted: next.isExhausted,
    becameExhausted: false,
    recovered: false,
    coins: next.coins,
    coinsGained,
    heartsLost: 0,
    damageShielded: false,
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
