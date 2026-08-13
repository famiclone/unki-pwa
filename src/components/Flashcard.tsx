import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Card } from '@/db'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import {
  DEFAULT_DECK_COLOR,
  getContrastYIQ,
  normalizeHexColor,
} from '@/lib/colorUtils'
import { cancelSpeech, speakIfShort } from '@/lib/speech'
import { cn } from '@/lib/utils'
import styles from './Flashcard.module.css'

const TAP_SLOP = 12
const SWIPE_THRESHOLD = 88
const EXIT_DISTANCE = 480
const EXIT_MS = 220

type FlashcardProps = {
  card: Card
  revealed: boolean
  meta?: string
  deckColor?: string
  swipeEnabled?: boolean
  onFlip: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

/**
 * Study flashcard with the 3D flip / aesthetics from famiclone/unki.
 * Front = side 0 (primary), back = side 1 (rotateY 180° + counter-rotated content).
 * Horizontal swipe (when enabled): left = Study again, right = I know.
 */
export function Flashcard({
  card,
  revealed,
  meta,
  deckColor,
  swipeEnabled = false,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
}: FlashcardProps) {
  const imageUrl = useObjectUrl(card.image)
  const frontColor = normalizeHexColor(deckColor ?? DEFAULT_DECK_COLOR)
  const contrast = getContrastYIQ(frontColor)
  const flashVars = {
    '--flash-bg': frontColor,
    '--flash-fg': contrast === 'text-black' ? '#111111' : '#ffffff',
  } as CSSProperties

  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
  const [entering, setEntering] = useState(true)
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null)
  const dragRef = useRef(false)
  const offsetRef = useRef(0)

  useEffect(() => {
    setOffsetX(0)
    setDragging(false)
    setExiting(null)
    startRef.current = null
    dragRef.current = false
    offsetRef.current = 0
  }, [card.id])

  useEffect(() => {
    return () => cancelSpeech()
  }, [card.id])

  function handleFlip() {
    if (revealed) cancelSpeech()
    else speakIfShort(card.back)
    onFlip()
  }

  function commitSwipe(direction: 'left' | 'right') {
    setExiting(direction)
    setOffsetX(direction === 'left' ? -EXIT_DISTANCE : EXIT_DISTANCE)
    window.setTimeout(() => {
      if (direction === 'left') onSwipeLeft?.()
      else onSwipeRight?.()
    }, EXIT_MS)
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
      if (!swipeEnabled || Math.abs(dx) < Math.abs(dy)) {
        startRef.current = null
        return
      }
      dragRef.current = true
      setDragging(true)
    }

    event.preventDefault()
    offsetRef.current = dx
    setOffsetX(dx)
  }

  function endPointer(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const start = startRef.current
    if (!start || start.id !== event.pointerId) return
    startRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!dragRef.current) {
      if (!cancelled) handleFlip()
      return
    }

    dragRef.current = false
    setDragging(false)
    const dx = offsetRef.current
    offsetRef.current = 0

    if (!cancelled && swipeEnabled && dx <= -SWIPE_THRESHOLD) {
      commitSwipe('left')
      return
    }
    if (!cancelled && swipeEnabled && dx >= SWIPE_THRESHOLD) {
      commitSwipe('right')
      return
    }

    setOffsetX(0)
  }

  const rotation = offsetX / 28
  const progress = Math.min(1, Math.abs(offsetX) / SWIPE_THRESHOLD)
  const showLeftHint = swipeEnabled && offsetX < -24
  const showRightHint = swipeEnabled && offsetX > 24

  return (
    <div
      className={cn(
        styles.container,
        dragging && styles.dragging,
        exiting && styles.exiting,
        entering && styles.entering,
      )}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setEntering(false)
      }}
      style={
        dragging || exiting || offsetX !== 0
          ? {
              transform: `translateX(${offsetX}px) rotate(${rotation}deg)`,
              opacity: exiting ? 0 : 1,
            }
          : undefined
      }
    >
      {showLeftHint ? (
        <span className={cn(styles.hint, styles.hintLeft)} style={{ opacity: progress }}>
          Study again
        </span>
      ) : null}
      {showRightHint ? (
        <span className={cn(styles.hint, styles.hintRight)} style={{ opacity: progress }}>
          I know
        </span>
      ) : null}
      <div
        className={cn(styles.wrapper, revealed && styles.flipped)}
        style={flashVars}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endPointer(event, false)}
        onPointerCancel={(event) => endPointer(event, true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleFlip()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={
          revealed
            ? 'Flashcard back — swipe left to study again, right if you know it'
            : 'Flashcard front — click to flip'
        }
      >
        <div className={cn(styles.front, contrast)}>
          <div className={styles.face}>
            {imageUrl ? (
              <img src={imageUrl} alt="" className={styles.image} />
            ) : null}
            <p className={styles.frontText}>{card.front}</p>
            {card.romaji ? <p className={styles.romaji}>{card.romaji}</p> : null}
          </div>
          {meta ? <div className={styles.meta}>{meta}</div> : null}
        </div>
        <div className={styles.back}>
          <div className={styles.backFace}>
            <p className={styles.backText}>{card.back}</p>
            {card.example ? <p className={styles.example}>{card.example}</p> : null}
          </div>
          {meta ? <div className={styles.meta}>{meta}</div> : null}
        </div>
      </div>
    </div>
  )
}
