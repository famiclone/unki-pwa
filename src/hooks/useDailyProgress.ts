import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { toLocalDateString } from '@/hooks/useStreak'

export type DailyProgressStats = {
  cardsToStudy: number
  cardsStudiedToday: number
  loading: boolean
}

async function loadDailyProgress(today: string): Promise<{
  cardsToStudy: number
  cardsStudiedToday: number
}> {
  const [cardsToStudy, log] = await Promise.all([
    db.reviews.where('due').belowOrEqual(Date.now()).count(),
    db.dailyLog.get(today),
  ])

  return {
    cardsToStudy,
    cardsStudiedToday: log?.cardsReviewed ?? 0,
  }
}

/** Live due-today count + today's dailyLog review total. */
export function useDailyProgress(): DailyProgressStats {
  const today = toLocalDateString()
  const data = useLiveQuery(() => loadDailyProgress(today), [today])

  return {
    cardsToStudy: data?.cardsToStudy ?? 0,
    cardsStudiedToday: data?.cardsStudiedToday ?? 0,
    loading: data === undefined,
  }
}
