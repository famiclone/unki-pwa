import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Box } from 'lucide-react'
import type { Item } from '@/lib/items'
import { cn } from '@/lib/utils'
import { LootActions, LootCardFace } from '@/components/LootReveal'

const TAP_SLOP = 12
const SWIPE_UP_THRESHOLD = 96
const FLIP_MS = 1000

type ChestEncounterProps = {
  item: Item
  revealed: boolean
  busy: boolean
  onOpen: () => void
  onUseNow: () => void
  onAddToInventory: () => void
  onContinue: () => void
}

/**
 * Card-sized treasure chest. Swipe up (or Enter/Space) spins it vertically
 * like a study-card flip, then lands on the loot face.
 */
export function ChestEncounter({
  item,
  revealed,
  busy,
  onOpen,
  onUseNow,
  onAddToInventory,
  onContinue,
}: ChestEncounterProps) {
  const [offsetY, setOffsetY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const openedRef = useRef(false)
  const onOpenRef = useRef(onOpen)
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null)
  const dragRef = useRef(false)
  const offsetRef = useRef(0)

  onOpenRef.current = onOpen

  useEffect(() => {
    if (revealed) {
      openedRef.current = true
      setSpinning(false)
      setOffsetY(0)
    }
  }, [revealed])

  function finishOpen() {
    if (openedRef.current) return
    openedRef.current = true
    onOpenRef.current()
  }

  function commitOpen() {
    if (spinning || revealed || openedRef.current) return
    setDragging(false)
    setOffsetY(0)
    offsetRef.current = 0

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduceMotion) {
      finishOpen()
      return
    }

    setSpinning(true)
  }

  useEffect(() => {
    if (!spinning) return
    const id = window.setTimeout(finishOpen, FLIP_MS)
    return () => window.clearTimeout(id)
  }, [spinning])

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (spinning || revealed) return
    startRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    dragRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = startRef.current
    if (!start || start.id !== event.pointerId || spinning || revealed) return

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

  const locked = spinning || revealed
  const progress = Math.min(1, Math.max(0, -offsetY) / SWIPE_UP_THRESHOLD)

  return (
    <div className="study-loot study-chest">
      <div
        className={cn(
          'chest-scene',
          dragging && 'chest-scene-dragging',
          spinning && 'chest-scene-spinning',
          revealed && 'chest-scene-revealed',
        )}
        style={
          dragging || offsetY !== 0
            ? { transform: `translateY(${offsetY}px)` }
            : undefined
        }
      >
        <div
          className={cn(
            'chest-flip',
            spinning && 'chest-flip-spinning',
            revealed && 'chest-flip-revealed',
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => endPointer(event, false)}
          onPointerCancel={(event) => endPointer(event, true)}
          onKeyDown={(event) => {
            if (locked) return
            if (
              event.key === 'Enter' ||
              event.key === ' ' ||
              event.key === 'ArrowUp'
            ) {
              event.preventDefault()
              commitOpen()
            }
          }}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && spinning) {
              finishOpen()
            }
          }}
          role={revealed ? undefined : 'button'}
          tabIndex={revealed ? -1 : 0}
          aria-label={
            revealed
              ? undefined
              : 'Treasure chest — swipe up to open'
          }
        >
          <div className="chest-face chest-face-front">
            <div
              className="chest-art"
              style={{ opacity: 1 - progress * 0.15 }}
            >
              <Box aria-hidden />
            </div>
          </div>
          <div
            className={cn(
              'chest-face chest-face-back loot-card',
              `loot-card-${item.type}`,
            )}
          >
            <LootCardFace item={item} />
          </div>
        </div>
      </div>

      {revealed ? (
        <LootActions
          item={item}
          busy={busy}
          onUseNow={onUseNow}
          onAddToInventory={onAddToInventory}
          onContinue={onContinue}
        />
      ) : spinning ? null : (
        <p className="chest-hint">Swipe UP to open</p>
      )}
    </div>
  )
}
