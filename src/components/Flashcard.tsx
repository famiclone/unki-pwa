import type { CSSProperties } from 'react'
import type { Card } from '@/db'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import {
  DEFAULT_DECK_COLOR,
  getContrastYIQ,
  normalizeHexColor,
} from '@/lib/colorUtils'
import { cn } from '@/lib/utils'
import styles from './Flashcard.module.css'

type FlashcardProps = {
  card: Card
  revealed: boolean
  meta?: string
  deckColor?: string
  onFlip: () => void
}

/**
 * Study flashcard with the 3D flip / aesthetics from famiclone/unki.
 * Front = side 0 (primary), back = side 1 (rotateY 180° + counter-rotated content).
 */
export function Flashcard({
  card,
  revealed,
  meta,
  deckColor,
  onFlip,
}: FlashcardProps) {
  const imageUrl = useObjectUrl(card.image)
  const sideClass = revealed ? styles.side1 : styles.side0
  const color = deckColor
    ? normalizeHexColor(deckColor)
    : revealed
      ? undefined
      : DEFAULT_DECK_COLOR
  const contrast = color ? getContrastYIQ(color) : undefined
  const flashVars = color
    ? ({
        '--flash-bg': color,
        '--flash-fg': contrast === 'text-black' ? '#111111' : '#ffffff',
      } as CSSProperties)
    : undefined

  return (
    <div className={styles.container}>
      <div
        className={cn(styles.wrapper, sideClass, contrast)}
        style={flashVars}
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onFlip()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={revealed ? 'Flashcard back' : 'Flashcard front — click to flip'}
      >
        {!revealed ? (
          <div className={styles.face}>
            {imageUrl ? (
              <img src={imageUrl} alt="" className={styles.image} />
            ) : null}
            <p className={styles.frontText}>{card.front}</p>
            {card.romaji ? <p className={styles.romaji}>{card.romaji}</p> : null}
          </div>
        ) : (
          <div className={styles.backFace}>
            <p className={styles.backText}>{card.back}</p>
            {card.example ? <p className={styles.example}>{card.example}</p> : null}
          </div>
        )}
        {meta ? <div className={styles.meta}>{meta}</div> : null}
      </div>
    </div>
  )
}
