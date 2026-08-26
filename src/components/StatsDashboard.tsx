import { useDailyProgress } from '@/hooks/useDailyProgress'
import { WeekProgressChart } from '@/components/WeekProgressChart'

const METRICS = [
  { key: 'cardsStudiedToday', label: 'Learned' },
  { key: 'cardsToStudy', label: 'Remaining' },
  { key: 'cardsAddedToday', label: 'Added' },
] as const

export function CardStatBlocks() {
  const stats = useDailyProgress()

  return (
    <div
      aria-label="Today’s study plan"
      className="grid grid-cols-3 gap-2 sm:gap-3"
    >
      {METRICS.map(({ key, label }) => (
        <div
          key={key}
          className="rounded-xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-3 py-3 backdrop-blur-[2px] sm:px-4 sm:py-4"
        >
          <p className="m-0 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
            {stats.loading ? '—' : stats[key]}
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground sm:text-sm">
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}

export function StatsDashboard() {
  return (
    <section aria-label="Progress" className="grid grid-cols-1 gap-3">
      <WeekProgressChart />
    </section>
  )
}
