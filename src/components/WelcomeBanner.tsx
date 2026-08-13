import { useStreak } from '@/hooks/useStreak'
import { getTimeBasedGreeting } from '@/lib/greeting'

export function WelcomeBanner() {
  const { streak, loading } = useStreak()
  const greeting = getTimeBasedGreeting()

  const subtitle = loading
    ? 'Loading your streak…'
    : streak > 0
      ? `It's your ${streak}-day streak 🔥`
      : 'Start your streak today 🔥'

  return (
    <header className="space-y-1">
      <h1 className="m-0 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
        {greeting}!
      </h1>
      <p className="m-0 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
    </header>
  )
}
