import { Flame } from 'lucide-react'
import { usePastWeekProgress } from '@/hooks/usePastWeekProgress'
import { cn } from '@/lib/utils'

export function WeekProgressChart() {
  const { days, weekTotal, streak } = usePastWeekProgress()
  const maxCount = Math.max(1, ...days.map((day) => day.cardsReviewed))

  return (
    <section
      aria-label="Past week reviews"
      className="rounded-xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-4 py-4 backdrop-blur-[2px]"
    >
      <p className="m-0 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-foreground tabular-nums sm:text-5xl">
        {weekTotal}
      </p>
      <p className="m-0 mt-1 text-sm text-muted-foreground">This week</p>

      <div className="mt-4 flex items-end justify-between gap-2">
        {days.map((day) => {
          const height = day.cardsReviewed === 0 ? 8 : Math.max(12, Math.round((day.cardsReviewed / maxCount) * 72))

          return (
            <div
              key={day.date}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <div className="flex h-5 items-center justify-center">
                {day.isToday && streak > 0 ? (
                  <span
                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-orange-500 tabular-nums"
                    title={`${streak}-day streak`}
                  >
                    <Flame className="size-3 fill-orange-500/30" aria-hidden />
                    {streak}
                  </span>
                ) : null}
              </div>
              <div
                className="flex h-[72px] w-full items-end justify-center"
                title={`${day.dateLabel}: ${day.cardsReviewed} reviewed`}
              >
                <div
                  className={cn(
                    'w-full max-w-6 rounded-sm',
                    day.isStreakDay
                      ? 'bg-[var(--unki-primary)]'
                      : 'bg-muted-foreground/25',
                  )}
                  style={{ height: `${height}px` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">{day.dateLabel}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
