import type { DailyLog } from '@/db'
import { toLocalDateString } from '@/hooks/useStreak'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export type ActivityDay = {
  date: string
  dateLabel: string
  calendarDay: number
  cardsReviewed: number
  isToday: boolean
}

function localDateOffset(daysAgo: number, now = new Date()): Date {
  const date = new Date(now)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date
}

/** Last N local calendar days, merged with dailyLog rows. */
export function buildActivityDays(
  activityLog: DailyLog[],
  dayCount = 14,
  now = new Date(),
): ActivityDay[] {
  const logByDate = new Map(
    activityLog.map((entry) => [entry.id, entry.cardsReviewed]),
  )
  const today = toLocalDateString(now)

  return Array.from({ length: dayCount }, (_, index) => {
    const date = localDateOffset(dayCount - 1 - index, now)
    const id = toLocalDateString(date)
    return {
      date: id,
      dateLabel: WEEKDAY_LABELS[date.getDay()] ?? '',
      calendarDay: date.getDate(),
      cardsReviewed: logByDate.get(id) ?? 0,
      isToday: id === today,
    }
  })
}

type ActivityChartProps = {
  activityLog: DailyLog[]
  dayCount?: number
}

export function ActivityChart({ activityLog, dayCount = 14 }: ActivityChartProps) {
  const days = buildActivityDays(activityLog, dayCount)
  const maxCount = Math.max(1, ...days.map((day) => day.cardsReviewed))
  const periodTotal = days.reduce((sum, day) => sum + day.cardsReviewed, 0)

  return (
    <div className="rounded-xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-4 py-4 backdrop-blur-[2px]">
      <p className="m-0 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground tabular-nums">
        {periodTotal}
      </p>
      <p className="m-0 mt-1 text-sm text-muted-foreground">
        Reviews in the last {dayCount} days
      </p>

      <div
        className="mt-4 flex items-end justify-between gap-0.5 sm:gap-1"
        role="img"
        aria-label={`Study activity over the last ${dayCount} days`}
      >
        {days.map((day) => {
          const height =
            day.cardsReviewed === 0
              ? 6
              : Math.max(12, Math.round((day.cardsReviewed / maxCount) * 64))

          return (
            <div
              key={day.date}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-0.5 pb-1 pt-0.5',
                day.isToday && 'bg-muted/50',
              )}
              title={`${day.dateLabel} ${day.calendarDay}: ${day.cardsReviewed} reviewed`}
            >
              <div className="flex h-[64px] w-full items-end justify-center">
                <div
                  className={cn(
                    'w-full max-w-4 rounded-sm transition-colors',
                    day.cardsReviewed > 0
                      ? 'bg-[var(--unki-primary)]'
                      : 'bg-muted-foreground/20',
                    day.isToday && day.cardsReviewed > 0 && 'ring-1 ring-primary/40',
                  )}
                  style={{ height: `${height}px` }}
                />
              </div>
              <span
                className={cn(
                  'text-[9px] font-semibold tabular-nums sm:text-[10px]',
                  day.isToday ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {day.calendarDay}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
