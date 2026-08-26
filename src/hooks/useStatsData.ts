import { useLiveQuery } from 'dexie-react-hooks'
import { State } from 'ts-fsrs'
import { db, type DailyLog, type Stats } from '@/db'
import { createDefaultStats, getGlobalStats, toLocalDateString } from '@/hooks/useStreak'
import { generateHeatmapData, type HeatmapDay } from '@/lib/heatmap'

export type CardStateCounts = {
  new: number
  learning: number
  /** Cards in Review state (mastered schedule). */
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
  const cards = await db.cards.toArray()

  let review = 0
  let learning = 0
  let notStarted = 0

  for (const card of cards) {
    if (card.state === State.Review) review += 1
    else if (card.state === State.Learning || card.state === State.Relearning) {
      learning += 1
    } else notStarted += 1
  }

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
 * Aggregated stats for the Statistics screen: global stats, FSRS card counts,
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
