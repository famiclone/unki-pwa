import type { DailyLog } from '@/db'
import { toLocalDateString } from '@/hooks/useStreak'

export type HeatmapDay = {
  date: string
  count: number
}

export type ContributionTier = 0 | 1 | 2 | 3 | 4

function localDateOffset(daysAgo: number, now = new Date()): Date {
  const date = new Date(now)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date
}

/** Map review count to GitHub-style contribution intensity (0–4). */
export function getContributionTier(count: number): ContributionTier {
  if (count <= 0) return 0
  if (count <= 10) return 1
  if (count <= 30) return 2
  if (count <= 50) return 3
  return 4
}

/** Last N local calendar days (oldest first), merged with dailyLog rows. */
export function generateHeatmapData(
  dailyLogs: DailyLog[],
  days = 90,
  now = new Date(),
): HeatmapDay[] {
  const logByDate = new Map(
    dailyLogs.map((entry) => [entry.id, entry.cardsReviewed]),
  )

  return Array.from({ length: days }, (_, index) => {
    const date = localDateOffset(days - 1 - index, now)
    const id = toLocalDateString(date)
    return {
      date: id,
      count: logByDate.get(id) ?? 0,
    }
  })
}

export function heatmapPeriodTotal(days: HeatmapDay[]): number {
  return days.reduce((sum, day) => sum + day.count, 0)
}

export function formatHeatmapTooltip(date: string, count: number): string {
  const parsed = new Date(`${date}T12:00:00`)
  const label = parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  if (count === 0) return `No reviews on ${label}`
  if (count === 1) return `1 review on ${label}`
  return `${count} reviews on ${label}`
}

export const CONTRIBUTION_TIER_CLASS: Record<ContributionTier, string> = {
  0: 'bg-neutral-200 dark:bg-neutral-800',
  1: 'bg-emerald-900/50',
  2: 'bg-emerald-700',
  3: 'bg-emerald-500',
  4: 'bg-emerald-400',
}
