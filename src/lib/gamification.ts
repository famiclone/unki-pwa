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

/** Rank title derived from level. */
export function getRankTitle(level: number): string {
  const safeLevel = Math.max(1, Math.floor(level))
  const tier = RANK_TIERS.find((entry) => safeLevel >= entry.minLevel)
  return tier?.title ?? 'Novice'
}

/**
 * EXP for a single rating. Again is 0.
 * New-card bonus applies only when the review earned base EXP.
 */
export function expForReview(grade: Grade, wasNew: boolean): number {
  let gained = 0
  if (grade === 2) gained = 8
  else if (grade === 3 || grade === 4) gained = 5
  if (wasNew && gained > 0) gained += 10
  return gained
}
