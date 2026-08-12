import type { Review } from '@/db'

/**
 * Map review SRS stats to a 0–100 "battery" progress value.
 * Uses state, reps, and stability (SM-2 interval days).
 */
export function getSrsProgress(review: Review | null | undefined): number {
  if (!review || review.state === 'new') return 0

  if (review.state === 'learning') {
    return Math.min(35, 8 + review.reps * 9)
  }

  // Reviewing: climb with successful reps and longer intervals.
  const fromReps = Math.min(40, review.reps * 6)
  const fromInterval = Math.min(50, Math.log2(Math.max(review.stability, 1) + 1) * 12)
  return Math.min(100, Math.round(35 + fromReps + fromInterval))
}
