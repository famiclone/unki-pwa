import { useCardStats } from '@/hooks/useCardStats'

const METRICS = [
  { key: 'learned', label: 'Learned' },
  { key: 'learning', label: 'Learning' },
  { key: 'new', label: 'New' },
] as const

export function StatsDashboard() {
  const stats = useCardStats()

  return (
    <section
      aria-label="Card statistics"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {METRICS.map(({ key, label }) => (
        <div
          key={key}
          className="rounded-xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-4 py-4 backdrop-blur-[2px]"
        >
          <p className="m-0 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-foreground tabular-nums sm:text-5xl">
            {stats[key]}
          </p>
          <p className="m-0 mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
      ))}
    </section>
  )
}
