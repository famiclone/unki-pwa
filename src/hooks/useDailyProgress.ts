import { useLiveQuery } from 'dexie-react-hooks'
import { countStudyQueue, db } from '@/db'
import { toLocalDateString } from '@/hooks/useStreak'

export type DailyProgressStats = {
  /** SRS queue size: due (non-new) + capped new cards. */
  cardsToStudy: number
  /** Reviews logged in today's dailyLog. */
  cardsStudiedToday: number
  /** Cards created today (local calendar day). */
  cardsAddedToday: number
  loading: boolean
}

function localDayBounds(now = new Date()): { start: number; end: number } {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.getTime(), end: end.getTime() }
}

async function loadDailyProgress(today: string): Promise<{
  cardsToStudy: number
  cardsStudiedToday: number
  cardsAddedToday: number
}> {
  const { start, end } = localDayBounds()
  const [cardsToStudy, log, cardsAddedToday] = await Promise.all([
    countStudyQueue(),
    db.dailyLog.get(today),
    db.cards.where('createdAt').between(start, end, true, false).count(),
  ])

  return {
    cardsToStudy,
    cardsStudiedToday: log?.cardsReviewed ?? 0,
    cardsAddedToday,
  }
}

/** Live SRS queue size, today's reviews, and cards added today. */
export function useDailyProgress(): DailyProgressStats {
  const today = toLocalDateString()
  const data = useLiveQuery(() => loadDailyProgress(today), [today])

  return {
    cardsToStudy: data?.cardsToStudy ?? 0,
    cardsStudiedToday: data?.cardsStudiedToday ?? 0,
    cardsAddedToday: data?.cardsAddedToday ?? 0,
    loading: data === undefined,
  }
}
