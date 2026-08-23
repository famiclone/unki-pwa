import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DailyLog, type Stats } from '@/db'
import { createDefaultStats, getGlobalStats, toLocalDateString } from '@/hooks/useStreak'
import { generateHeatmapData, type HeatmapDay } from '@/lib/heatmap'

export type CardStateCounts = {
  new: number
  learning: number
  /** Cards in review state (mastered). */
  review: number
}

export type StatsData = {
  userStats: Stats
  cardCounts: CardStateCounts
  activityLog: DailyLog[]
  heatmapData: HeatmapDay[]
}

const EMPTY_CARD_COUNTS: CardStateCounts = {
  new: 0,
  learning: 0,
  review: 0,
}

const HEATMAP_DAYS = 90

async function loadCardStateCounts(): Promise<CardStateCounts> {
  const [reviews, cardCount] = await Promise.all([
    db.reviews.toArray(),
    db.cards.count(),
  ])

  let review = 0
  let learning = 0
  let notStarted = 0

  for (const row of reviews) {
    if (row.state === 'review') review += 1
    else if (row.state === 'learning') learning += 1
    else notStarted += 1
  }

  const missingReviews = Math.max(0, cardCount - reviews.length)
  notStarted += missingReviews

  return {
    new: notStarted,
    learning,
    review,
  }
}

async function loadActivityLog(dayCount = HEATMAP_DAYS): Promise<DailyLog[]> {
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  const ids = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (dayCount - 1 - index))
    return toLocalDateString(date)
  })
  const logs = await db.dailyLog.bulkGet(ids)
  return logs.filter((entry): entry is DailyLog => entry != null)
}

async function loadStatsData(): Promise<StatsData> {
  const activityLog = await loadActivityLog()
  const [userStats, cardCounts] = await Promise.all([
    getGlobalStats(),
    loadCardStateCounts(),
  ])

  return {
    userStats,
    cardCounts,
    activityLog,
    heatmapData: generateHeatmapData(activityLog, HEATMAP_DAYS),
  }
}

/**
 * Aggregated stats for the Statistics screen: global stats, SRS card counts,
 * dailyLog activity, and 90-day heatmap data.
 */
export function useStatsData() {
  const data = useLiveQuery(loadStatsData, [])

  return {
    userStats: data?.userStats ?? createDefaultStats(),
    cardCounts: data?.cardCounts ?? EMPTY_CARD_COUNTS,
    activityLog: data?.activityLog ?? [],
    heatmapData: data?.heatmapData ?? generateHeatmapData([]),
    loading: data === undefined,
  }
}
