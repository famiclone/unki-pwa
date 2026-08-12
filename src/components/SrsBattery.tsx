import { cn } from '@/lib/utils'

type SrsBatteryProps = {
  progress: number
  className?: string
}

/** Vertical battery / progress indicator for SRS mastery. */
export function SrsBattery({ progress, className }: SrsBatteryProps) {
  const value = Math.max(0, Math.min(100, progress))
  const fillClass =
    value < 25
      ? 'bg-destructive'
      : value < 60
        ? 'bg-amber-500'
        : 'bg-primary'

  return (
    <div
      className={cn(
        'flex h-14 w-3 shrink-0 flex-col justify-end overflow-hidden rounded-full border border-border bg-muted',
        className,
      )}
      role="meter"
      aria-label={`SRS progress ${value}%`}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      title={`SRS ${value}%`}
    >
      <div
        className={cn('w-full rounded-full transition-[height]', fillClass)}
        style={{ height: `${value}%` }}
      />
    </div>
  )
}
