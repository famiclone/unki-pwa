import { type ReactNode, useRef } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion'
import { Ban, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const SWIPE_THRESHOLD = 100
const EXIT_DISTANCE = 520
const EXIT_MS = 0.2

type SwipeCardShellProps = {
  enabled: boolean
  children: ReactNode
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

/**
 * Tinder-style horizontal drag shell with Again / I know overlays.
 * Successful swipes fly off-screen and stay there until the card unmounts.
 */
export function SwipeCardShell({
  enabled,
  children,
  onSwipeLeft,
  onSwipeRight,
}: SwipeCardShellProps) {
  const x = useMotionValue(0)
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, -24, 0], [1, 0.45, 0])
  const rightOpacity = useTransform(x, [0, 24, SWIPE_THRESHOLD], [0, 0.45, 1])
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12])
  const exiting = useRef(false)

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (!enabled || exiting.current) return

    if (info.offset.x < -SWIPE_THRESHOLD) {
      exiting.current = true
      void animate(x, -EXIT_DISTANCE, { duration: EXIT_MS, ease: 'easeOut' })
      onSwipeLeft()
      return
    }

    if (info.offset.x > SWIPE_THRESHOLD) {
      exiting.current = true
      void animate(x, EXIT_DISTANCE, { duration: EXIT_MS, ease: 'easeOut' })
      onSwipeRight()
      return
    }

    void animate(x, 0, { type: 'spring', stiffness: 420, damping: 32 })
  }

  return (
    <div className="relative w-full overflow-visible">
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 flex items-start justify-between p-4"
        aria-hidden
      >
        <motion.div
          style={{ opacity: leftOpacity }}
          className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg"
        >
          <Ban className="size-5" />
          Again
        </motion.div>
        <motion.div
          style={{ opacity: rightOpacity }}
          className="flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg"
        >
          I know
          <Check className="size-5" />
        </motion.div>
      </motion.div>

      <motion.div
        style={{ x, rotate }}
        drag={enabled && !exiting.current ? 'x' : false}
        dragElastic={0.9}
        onDragEnd={handleDragEnd}
        className={cn(
          'relative w-full touch-pan-y',
          enabled && !exiting.current && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {children}
      </motion.div>
    </div>
  )
}
