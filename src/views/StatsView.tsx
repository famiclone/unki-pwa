import { calculateLevelStats } from '@/lib/gamification'
import { getDisplayStreak } from '@/hooks/useStreak'
import { useStatsData } from '@/hooks/useStatsData'
import { ActivityChart } from '@/components/ActivityChart'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

function StatTile({
  icon,
  label,
  value,
  accentClass,
}: {
  icon: string
  label: string
  value: number
  accentClass?: string
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-4 py-4 backdrop-blur-[2px]">
      <p className="m-0 text-2xl" aria-hidden>
        {icon}
      </p>
      <p
        className={cn(
          'm-0 mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums tracking-tight',
          accentClass,
        )}
      >
        {value}
      </p>
      <p className="m-0 mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function MasteryBar({
  review,
  learning,
  undiscovered,
}: {
  review: number
  learning: number
  undiscovered: number
}) {
  const total = review + learning + undiscovered
  const pct = (count: number) => (total === 0 ? 0 : (count / total) * 100)

  if (total === 0) {
    return (
      <div
        className="h-4 w-full rounded-full bg-muted"
        aria-label="No cards yet"
      />
    )
  }

  return (
    <div
      className="flex h-4 w-full overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={`Mastery: ${review} mastered, ${learning} learning, ${undiscovered} undiscovered`}
    >
      {review > 0 ? (
        <div
          className="h-full bg-[var(--unki-primary)] transition-all"
          style={{ width: `${pct(review)}%` }}
        />
      ) : null}
      {learning > 0 ? (
        <div
          className="h-full bg-amber-500 transition-all"
          style={{ width: `${pct(learning)}%` }}
        />
      ) : null}
      {undiscovered > 0 ? (
        <div
          className="h-full bg-muted-foreground/35 transition-all"
          style={{ width: `${pct(undiscovered)}%` }}
        />
      ) : null}
    </div>
  )
}

export function StatsView() {
  const { userStats, cardCounts, activityLog, loading } = useStatsData()
  const level = calculateLevelStats(userStats.exp)
  const currentStreak = getDisplayStreak(userStats)
  const totalCards = cardCounts.review + cardCounts.learning + cardCounts.new

  if (loading) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="m-0 text-3xl tracking-tight">Statistics</h1>
          <p className="m-0 text-sm text-muted-foreground">Loading your progress…</p>
        </header>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-1">
        <h1 className="m-0 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Statistics
        </h1>
        <p className="m-0 text-sm text-muted-foreground">
          Your level, streaks, and deck mastery at a glance.
        </p>
      </header>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-6 py-8 backdrop-blur-[2px]">
        <div
          className="relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 shadow-lg shadow-amber-500/25"
          aria-label={`Level ${level.currentLevel}`}
        >
          <div className="flex size-[6.25rem] flex-col items-center justify-center rounded-full bg-background/95">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Level
            </span>
            <span className="font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums leading-none text-foreground">
              {level.currentLevel}
            </span>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs font-medium tabular-nums text-muted-foreground">
            <span>{level.currentLevelExp} XP</span>
            <span>{level.expNeededForNextLevel} XP to next</span>
          </div>
          <Progress
            value={level.progressPercentage}
            className="h-3 bg-amber-500/15"
            indicatorClassName="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level.progressPercentage)}
            aria-label="Experience toward next level"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon="🔥"
          label="Current Streak"
          value={currentStreak}
          accentClass="text-orange-500"
        />
        <StatTile
          icon="🏆"
          label="Best Streak"
          value={userStats.maxStreak}
          accentClass="text-amber-600 dark:text-amber-400"
        />
      </div>

      <section className="space-y-3" aria-labelledby="study-activity-heading">
        <h2
          id="study-activity-heading"
          className="m-0 text-lg font-semibold tracking-tight"
        >
          Study Activity
        </h2>
        <ActivityChart activityLog={activityLog} dayCount={14} />
      </section>

      <section className="space-y-4" aria-labelledby="deck-mastery-heading">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="deck-mastery-heading"
            className="m-0 text-lg font-semibold tracking-tight"
          >
            Deck Mastery
          </h2>
          <p className="m-0 text-sm font-medium tabular-nums text-muted-foreground">
            Total Cards: {totalCards}
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-4 py-4 backdrop-blur-[2px]">
          <MasteryBar
            review={cardCounts.review}
            learning={cardCounts.learning}
            undiscovered={cardCounts.new}
          />

          <ul className="m-0 grid grid-cols-1 gap-2 p-0 sm:grid-cols-3">
            <li className="flex items-center justify-between gap-2 rounded-lg bg-[color-mix(in_oklab,var(--unki-primary)_12%,transparent)] px-3 py-2 sm:flex-col sm:items-start">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <span
                  className="size-2.5 shrink-0 rounded-full bg-[var(--unki-primary)]"
                  aria-hidden
                />
                Mastered
              </span>
              <span className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums text-[var(--unki-primary)]">
                {cardCounts.review}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 sm:flex-col sm:items-start">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <span
                  className="size-2.5 shrink-0 rounded-full bg-amber-500"
                  aria-hidden
                />
                Learning
              </span>
              <span className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {cardCounts.learning}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 sm:flex-col sm:items-start">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <span
                  className="size-2.5 shrink-0 rounded-full bg-muted-foreground/50"
                  aria-hidden
                />
                Undiscovered
              </span>
              <span className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums text-muted-foreground">
                {cardCounts.new}
              </span>
            </li>
          </ul>
        </div>
      </section>
    </section>
  )
}
