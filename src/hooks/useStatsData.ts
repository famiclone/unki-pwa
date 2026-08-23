import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DailyLog, type Stats } from '@/db'
import { createDefaultStats, getGlobalStats } from '@/hooks/useStreak'

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
}

const EMPTY_CARD_COUNTS: CardStateCounts = {
  new: 0,
  learning: 0,
  review: 0,
}

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

async function loadActivityLog(): Promise<DailyLog[]> {
  const logs = await db.dailyLog.orderBy('id').reverse().limit(14).toArray()
  return logs.sort((a, b) => a.id.localeCompare(b.id))
}

async function loadStatsData(): Promise<StatsData> {
  const [userStats, cardCounts, activityLog] = await Promise.all([
    getGlobalStats(),
    loadCardStateCounts(),
    loadActivityLog(),
  ])

  return { userStats, cardCounts, activityLog }
}

/**
 * Aggregated stats for the Statistics screen: global stats, SRS card counts,
 * and the 14 most recent dailyLog entries (ascending by date).
 */
export function useStatsData() {
  const data = useLiveQuery(loadStatsData, [])

  return {
    userStats: data?.userStats ?? createDefaultStats(),
    cardCounts: data?.cardCounts ?? EMPTY_CARD_COUNTS,
    activityLog: data?.activityLog ?? [],
    loading: data === undefined,
  }
}
