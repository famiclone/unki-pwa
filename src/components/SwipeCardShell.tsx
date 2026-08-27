import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
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
const DEMO_STYLE_ID = 'unki-swipe-demo-keyframes'
const DEMO_TOTAL_MS = 900

type SwipeCardShellProps = {
  enabled: boolean
  /** One-shot left/right nudge to teach swiping (first card of a session). */
  demoSwipe?: boolean
  children: ReactNode
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

function ensureDemoStyles() {
  if (typeof document === 'undefined') return
  const css = `
@keyframes unki-swipe-demo {
  0% { transform: translate3d(0,0,0) rotate(0deg); }
  20% { transform: translate3d(-28px,0,0) rotate(-2deg); }
  45% { transform: translate3d(32px,0,0) rotate(2deg); }
  70% { transform: translate3d(-16px,0,0) rotate(-1deg); }
  100% { transform: translate3d(0,0,0) rotate(0deg); }
}
@keyframes unki-swipe-again {
  0%, 100% { opacity: 0; }
  15%, 28% { opacity: 1; }
  38% { opacity: 0; }
}
@keyframes unki-swipe-know {
  0%, 38% { opacity: 0; }
  48%, 60% { opacity: 1; }
  70%, 100% { opacity: 0; }
}
.unki-swipe-demo {
  animation: unki-swipe-demo 0.5s ease-in-out 0.35s both !important;
}
.unki-swipe-demo .unki-swipe-again-badge {
  animation: unki-swipe-again 0.5s ease-in-out 0.35s both !important;
}
.unki-swipe-demo .unki-swipe-know-badge {
  animation: unki-swipe-know 0.5s ease-in-out 0.35s both !important;
}
`
  let style = document.getElementById(DEMO_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = DEMO_STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = css
}

ensureDemoStyles()

/**
 * Tinder-style horizontal drag shell with Again / I know overlays.
 * Successful swipes fly off-screen and stay there until the card unmounts.
 */
export function SwipeCardShell({
  enabled,
  demoSwipe = false,
  children,
  onSwipeLeft,
  onSwipeRight,
}: SwipeCardShellProps) {
  const x = useMotionValue(0)
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, -24, 0], [1, 0.45, 0])
  const rightOpacity = useTransform(x, [0, 24, SWIPE_THRESHOLD], [0, 0.45, 1])
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12])
  const exiting = useRef(false)
  const [showDemo, setShowDemo] = useState(Boolean(demoSwipe))

  useLayoutEffect(() => {
    if (!demoSwipe) {
      setShowDemo(false)
      return
    }
    ensureDemoStyles()
    setShowDemo(true)
    const hide = window.setTimeout(() => setShowDemo(false), DEMO_TOTAL_MS)
    return () => window.clearTimeout(hide)
  }, [demoSwipe])

  function handleDragStart() {
    setShowDemo(false)
  }

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
    <div
      className="relative w-full overflow-visible"
      data-swipe-demo={demoSwipe ? '1' : '0'}
      data-demo-playing={showDemo ? '1' : '0'}
    >
      <div className={cn('relative w-full', showDemo && 'unki-swipe-demo')}>
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-start justify-between p-4"
          aria-hidden
        >
          <motion.div
            style={showDemo ? undefined : { opacity: leftOpacity }}
            className="unki-swipe-again-badge flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg"
          >
            <Ban className="size-5" />
            Again
          </motion.div>
          <motion.div
            style={showDemo ? undefined : { opacity: rightOpacity }}
            className="unki-swipe-know-badge flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg"
          >
            I know
            <Check className="size-5" />
          </motion.div>
        </div>

        <motion.div
          style={showDemo ? undefined : { x, rotate }}
          drag={enabled && !exiting.current && !showDemo ? 'x' : false}
          dragElastic={0.9}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={cn(
            'relative w-full touch-pan-y',
            enabled &&
              !exiting.current &&
              !showDemo &&
              'cursor-grab active:cursor-grabbing',
          )}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
