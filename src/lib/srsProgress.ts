import type { Card } from '@/db'
import { State } from 'ts-fsrs'
import { isNewCard } from '@/lib/fsrsService'

/**
 * Map FSRS card stats to a 0–100 "battery" progress value.
 */
export function getSrsProgress(card: Card | null | undefined): number {
  if (!card || isNewCard(card)) return 0

  if (card.state === State.Learning || card.state === State.Relearning) {
    return Math.min(35, 8 + card.reps * 9)
  }

  const fromReps = Math.min(40, card.reps * 6)
  const fromStability = Math.min(
    50,
    Math.log2(Math.max(card.stability, 1) + 1) * 12,
  )
  return Math.min(100, Math.round(35 + fromReps + fromStability))
}
