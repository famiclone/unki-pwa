import { useRef, useState, type PointerEvent } from 'react'
import { Box } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAP_SLOP = 12
const SWIPE_UP_THRESHOLD = 96
const EXIT_DISTANCE = 420
const EXIT_MS = 220

type ChestEncounterProps = {
  onOpen: () => void
}

/**
 * Card-sized treasure chest. A strong swipe up (or Enter/Space) opens it.
 */
export function ChestEncounter({ onOpen }: ChestEncounterProps) {
  const [offsetY, setOffsetY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState(false)
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null)
  const dragRef = useRef(false)
  const offsetRef = useRef(0)

  function commitOpen() {
    setExiting(true)
    setOffsetY(-EXIT_DISTANCE)
    window.setTimeout(() => onOpen(), EXIT_MS)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (exiting) return
    startRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    dragRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = startRef.current
    if (!start || start.id !== event.pointerId || exiting) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (!dragRef.current) {
      if (Math.hypot(dx, dy) < TAP_SLOP) return
      if (Math.abs(dy) < Math.abs(dx)) {
        startRef.current = null
        return
      }
      dragRef.current = true
      setDragging(true)
    }

    event.preventDefault()
    const next = Math.min(24, dy)
    offsetRef.current = next
    setOffsetY(next)
  }

  function endPointer(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const start = startRef.current
    if (!start || start.id !== event.pointerId) return
    startRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!dragRef.current) {
      return
    }

    dragRef.current = false
    setDragging(false)
    const dy = offsetRef.current
    offsetRef.current = 0

    if (!cancelled && dy <= -SWIPE_UP_THRESHOLD) {
      commitOpen()
      return
    }

    setOffsetY(0)
  }

  const progress = Math.min(1, Math.max(0, -offsetY) / SWIPE_UP_THRESHOLD)

  return (
    <div className="study-loot study-chest">
      <div
        className={cn(
          'chest-stage',
          dragging && 'chest-stage-dragging',
          exiting && 'chest-stage-exiting',
        )}
        style={
          dragging || exiting || offsetY !== 0
            ? { transform: `translateY(${offsetY}px)` }
            : undefined
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endPointer(event, false)}
        onPointerCancel={(event) => endPointer(event, true)}
        onKeyDown={(event) => {
          if (exiting) return
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowUp') {
            event.preventDefault()
            commitOpen()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Treasure chest — swipe up to open"
      >
        <div
          className="chest-art"
          style={{ opacity: exiting ? 0.35 : 1 - progress * 0.15 }}
        >
          <Box aria-hidden />
        </div>
      </div>
      <p className="chest-hint" aria-hidden={false}>
        Swipe UP to open
      </p>
    </div>
  )
}
