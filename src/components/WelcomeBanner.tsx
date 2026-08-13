import { useStreak } from '@/hooks/useStreak'
import { calculateLevelStats, getRankTitle } from '@/lib/gamification'
import { getTimeBasedGreeting } from '@/lib/greeting'
import { Progress } from '@/components/ui/progress'
import { HeartsDisplay } from '@/components/HeartsDisplay'
import { InventoryPanel } from '@/components/InventoryPanel'

export function WelcomeBanner() {
  const { streak, stats, loading } = useStreak()
  const greeting = getTimeBasedGreeting()
  const level = calculateLevelStats(stats.exp)
  const rank = getRankTitle(level.currentLevel)

  const subtitle = loading
    ? 'Loading your streak…'
    : streak > 0
      ? `It's your ${streak}-day streak 🔥`
      : 'Start your streak today 🔥'

  return (
    <header className="space-y-3">
      <div className="space-y-1">
        <h1 className="m-0 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          {greeting}!
        </h1>
        <p className="m-0 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
      </div>

      <div
        className="space-y-2"
        aria-label={`Level ${level.currentLevel}, ${rank}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2.5 py-0.5 text-zinc-950 shadow-sm">
            <span className="text-xs font-bold tracking-wide">
              Lv. {level.currentLevel}
            </span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-widest opacity-80">
              • {rank}
            </span>
          </span>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {level.currentLevelExp} / {level.expNeededForNextLevel} XP
          </span>
        </div>
        <Progress
          value={level.progressPercentage}
          className="h-2.5 bg-amber-500/15"
          indicatorClassName="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level.progressPercentage)}
          aria-label="Experience toward next level"
        />
      </div>

      <HeartsDisplay stats={stats} />
      <InventoryPanel />
    </header>
  )
}
