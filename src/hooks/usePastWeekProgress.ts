import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import {
  getDisplayStreak,
  getGlobalStats,
  toLocalDateString,
} from '@/hooks/useStreak'

export type WeekDayProgress = {
  /** Local YYYY-MM-DD. */
  date: string
  /** Short weekday label (e.g. Mon). */
  dateLabel: string
  cardsReviewed: number
  isStreakDay: boolean
  isToday: boolean
}

export type PastWeekProgress = {
  days: WeekDayProgress[]
  weekTotal: number
  streak: number
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localDateOffset(daysAgo: number, now = new Date()): Date {
  const date = new Date(now)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date
}

async function loadPastWeekProgress(now = new Date()): Promise<PastWeekProgress> {
  const today = toLocalDateString(now)
  const ids = Array.from({ length: 7 }, (_, index) => {
    const date = localDateOffset(6 - index, now)
    return toLocalDateString(date)
  })

  const [logs, stats] = await Promise.all([
    db.dailyLog.bulkGet(ids),
    getGlobalStats(),
  ])

  const days: WeekDayProgress[] = ids.map((id, index) => {
    const date = localDateOffset(6 - index, now)
    const log = logs[index]
    const cardsReviewed = log?.cardsReviewed ?? 0
    const didStudy = log?.didStudy ?? cardsReviewed > 0

    return {
      date: id,
      dateLabel: WEEKDAY_LABELS[date.getDay()] ?? '',
      cardsReviewed,
      isStreakDay: didStudy,
      isToday: id === today,
    }
  })

  return {
    days,
    weekTotal: days.reduce((sum, day) => sum + day.cardsReviewed, 0),
    streak: getDisplayStreak(stats),
  }
}

function emptyWeek(now = new Date()): WeekDayProgress[] {
  const today = toLocalDateString(now)
  return Array.from({ length: 7 }, (_, index) => {
    const date = localDateOffset(6 - index, now)
    const id = toLocalDateString(date)
    return {
      date: id,
      dateLabel: WEEKDAY_LABELS[date.getDay()] ?? '',
      cardsReviewed: 0,
      isStreakDay: false,
      isToday: id === today,
    }
  })
}

/**
 * Last 7 local calendar days of review activity (zeros for missing days).
 */
export function usePastWeekProgress(): PastWeekProgress {
  const progress = useLiveQuery(() => loadPastWeekProgress(), [])

  return (
    progress ?? {
      days: emptyWeek(),
      weekTotal: 0,
      streak: 0,
    }
  )
}
