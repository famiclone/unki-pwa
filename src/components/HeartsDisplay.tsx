import { Heart, Sword } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Stats } from '@/db'

type HeartsDisplayProps = {
  stats: Stats
  compact?: boolean
}

function HeartIcon({ fill }: { fill: 'full' | 'half' | 'empty' }) {
  return (
    <span className="relative inline-block size-5 shrink-0" aria-hidden>
      <Heart
        className={cn(
          'size-5',
          fill === 'empty' ? 'text-muted-foreground/40' : 'text-red-500',
          fill === 'full' && 'fill-red-500',
        )}
      />
      {fill === 'half' ? (
        <span className="absolute inset-0 w-1/2 overflow-hidden">
          <Heart className="size-5 fill-red-500 text-red-500" />
        </span>
      ) : null}
    </span>
  )
}

export function HeartsDisplay({ stats, compact = false }: HeartsDisplayProps) {
  const { hearts, maxHearts, attack, isExhausted } = stats
  const slots = Array.from({ length: maxHearts }, (_, index) => {
    if (hearts >= index + 1) return 'full' as const
    if (hearts >= index + 0.5) return 'half' as const
    return 'empty' as const
  })

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        compact && 'gap-2',
      )}
      aria-label={`${hearts} of ${maxHearts} hearts${isExhausted ? ', exhausted' : ''}`}
    >
      <div className="flex items-center gap-0.5">
        {slots.map((fill, index) => (
          <HeartIcon key={index} fill={fill} />
        ))}
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-widest tabular-nums',
          isExhausted ? 'text-muted-foreground/60' : 'text-amber-600 dark:text-amber-400',
        )}
      >
        <Sword
          className={cn('size-3.5', isExhausted && 'opacity-40')}
          aria-hidden
        />
        ATK {attack}
        {isExhausted ? (
          <span className="rounded-full border border-border px-1.5 py-px text-[0.6rem] font-bold tracking-widest text-muted-foreground">
            Exhausted
          </span>
        ) : null}
      </span>
    </div>
  )
}
