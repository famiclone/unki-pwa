import type { Grade } from '@/lib/srs'

export type LevelStats = {
  currentLevel: number
  currentLevelExp: number
  expNeededForNextLevel: number
  progressPercentage: number
}

export type ExpAward = {
  expGained: number
  previousLevel: number
  newLevel: number
  totalExp: number
  leveledUp: boolean
}

export type CombatStats = {
  attack: number
  maxHearts: number
}

export type CombatResult = ExpAward & {
  hearts: number
  maxHearts: number
  attack: number
  isExhausted: boolean
  becameExhausted: boolean
  recovered: boolean
}

export const BASE_HEARTS = 3
export const HEART_PER_TEN_LEVELS = 10
export const AGAIN_HEART_LOSS = 1
export const GOOD_HEART_GAIN = 0.5

export function snapHearts(value: number): number {
  return Math.round(value * 2) / 2
}

/** EXP required to leave `currentLevel` and reach the next one. */
export function nextLevelExp(currentLevel: number): number {
  const level = Math.max(1, Math.floor(currentLevel))
  return Math.floor(100 * Math.pow(level, 1.5))
}

/**
 * Derive level progress from lifetime EXP.
 * Curve: next level costs `floor(100 * level^1.5)`.
 */
export function calculateLevelStats(totalExp: number): LevelStats {
  let remaining = Math.max(0, Math.floor(totalExp))
  let currentLevel = 1
  let expNeededForNextLevel = nextLevelExp(currentLevel)

  while (remaining >= expNeededForNextLevel) {
    remaining -= expNeededForNextLevel
    currentLevel += 1
    expNeededForNextLevel = nextLevelExp(currentLevel)
  }

  const progressPercentage =
    expNeededForNextLevel <= 0
      ? 100
      : Math.min(100, (remaining / expNeededForNextLevel) * 100)

  return {
    currentLevel,
    currentLevelExp: remaining,
    expNeededForNextLevel,
    progressPercentage,
  }
}

/**
 * EXP for a single rating. Again is 0 (no farming).
 * New-card bonus applies only when the review earned base EXP.
 */
const RANK_TIERS = [
  { minLevel: 100, title: 'Legend' },
  { minLevel: 75, title: 'Master' },
  { minLevel: 50, title: 'Champion' },
  { minLevel: 40, title: 'Hero' },
  { minLevel: 30, title: 'Veteran' },
  { minLevel: 20, title: 'Adventurer' },
  { minLevel: 10, title: 'Apprentice' },
  { minLevel: 1, title: 'Novice' },
] as const

/** Classic RPG rank title derived from level. */
export function getRankTitle(level: number): string {
  const safeLevel = Math.max(1, Math.floor(level))
  const tier = RANK_TIERS.find((entry) => safeLevel >= entry.minLevel)
  return tier?.title ?? 'Novice'
}

export function expForReview(grade: Grade, wasNew: boolean): number {
  let gained = 0
  if (grade === 2) gained = 8
  else if (grade === 3 || grade === 4) gained = 5
  if (wasNew && gained > 0) gained += 10
  return gained
}

/** ATK = floor(level / 3). Max hearts = 3 + floor(level / 10). */
export function deriveCombatStats(level: number): CombatStats {
  const safeLevel = Math.max(1, Math.floor(level))
  return {
    attack: Math.floor(safeLevel / 3),
    maxHearts: BASE_HEARTS + Math.floor(safeLevel / HEART_PER_TEN_LEVELS),
  }
}

export function totalExpForReview(
  grade: Grade,
  wasNew: boolean,
  attack: number,
  isExhausted: boolean,
): number {
  const base = expForReview(grade, wasNew)
  if (base <= 0) return 0
  return base + (isExhausted ? 0 : Math.max(0, attack))
}
