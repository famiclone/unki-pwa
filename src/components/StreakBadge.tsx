import { Flame } from 'lucide-react'
import { useStreak } from '@/hooks/useStreak'
import { cn } from '@/lib/utils'

export function StreakBadge() {
  const { streak, isActive, loading } = useStreak()

  if (loading) {
    return (
      <span
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm text-muted-foreground"
        aria-hidden
      >
        …
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold tabular-nums',
        isActive
          ? 'text-orange-500'
          : 'text-muted-foreground opacity-70',
      )}
      title={
        isActive
          ? `${streak}-day study streak`
          : 'No active streak — review a card to start'
      }
      aria-label={
        isActive
          ? `Study streak: ${streak} days`
          : 'Study streak: inactive'
      }
    >
      <Flame
        className={cn('size-5', isActive ? 'fill-orange-500/30' : undefined)}
        aria-hidden
      />
      <span>{streak}</span>
    </span>
  )
}
