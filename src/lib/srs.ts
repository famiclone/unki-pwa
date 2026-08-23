import type { Review, ReviewState } from '../db'

/** Evaluation grade: 1 Again, 2 Hard, 3 Good, 4 Easy. */
export type Grade = 1 | 2 | 3 | 4

export const GRADE_LABELS: Record<Grade, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
}

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3
/** Relearn delay after Again so the card leaves the current session. */
export const AGAIN_RELEARN_MS = 5 * 60 * 1000

export type ApplySm2Options = {
  now?: number
}

/**
 * SM-2 working stats.
 * Mapped onto Review as: stability → interval (days), difficulty → ease factor.
 */
export type SrsStats = {
  reps: number
  /** Interval in whole days until the next review. */
  interval: number
  easeFactor: number
  due: number
  state: ReviewState
}

export function createInitialSrsStats(now = Date.now()): SrsStats {
  return {
    reps: 0,
    interval: 0,
    easeFactor: DEFAULT_EASE,
    due: now,
    state: 'new',
  }
}

/** Read SM-2 stats from a Review row (or initialize if missing). */
export function reviewToSrsStats(review?: Review | null): SrsStats {
  if (!review) return createInitialSrsStats()

  return {
    reps: review.reps,
    interval: review.stability,
    easeFactor: review.difficulty > 0 ? review.difficulty : DEFAULT_EASE,
    due: review.due,
    state: review.state,
  }
}

/** Persist SM-2 stats onto a Review row for a card. */
export function srsStatsToReview(cardId: string, stats: SrsStats): Review {
  return {
    cardId,
    state: stats.state,
    due: stats.due,
    stability: stats.interval,
    difficulty: stats.easeFactor,
    reps: stats.reps,
  }
}

/**
 * Map UI grades 1–4 onto classic SM-2 quality scores (0–5).
 * Again fails (< 3); Hard/Good/Easy pass with increasing quality.
 */
function gradeToQuality(grade: Grade): number {
  switch (grade) {
    case 1:
      return 1
    case 2:
      return 3
    case 3:
      return 4
    case 4:
      return 5
  }
}

/**
 * Basic SM-2 update.
 * Accepts current review stats (or initializes new ones) and a grade 1–4.
 * Returns the next due date, interval (days), and ease factor.
 */
export function applySm2(
  current: SrsStats | Review | null | undefined,
  grade: Grade,
  options: ApplySm2Options = {},
): SrsStats {
  const now = options.now ?? Date.now()
  const prev: SrsStats =
    current && 'easeFactor' in current
      ? current
      : reviewToSrsStats(current as Review | null | undefined)

  const q = gradeToQuality(grade)
  let { reps, interval, easeFactor } = prev

  if (q < 3) {
    // Failed recall — restart the repetition count; relearn later, not now.
    reps = 0
    interval = 0
  } else {
    if (reps === 0) {
      interval = 1
    } else if (reps === 1) {
      interval = 6
    } else {
      interval = Math.max(1, Math.round(interval * easeFactor))
    }
    // Easy gets a mild bonus interval.
    if (grade === 4 && reps > 0) {
      interval = Math.max(interval + 1, Math.round(interval * 1.3))
    }
    reps += 1
  }

  // Classic SM-2 ease-factor update.
  easeFactor =
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (easeFactor < MIN_EASE) easeFactor = MIN_EASE

  const due =
    q < 3 ? now + AGAIN_RELEARN_MS : now + interval * DAY_MS

  const state: ReviewState =
    q < 3 ? 'learning' : interval >= 1 && reps >= 2 ? 'review' : 'learning'

  return {
    reps,
    interval,
    easeFactor: Math.round(easeFactor * 100) / 100,
    due,
    state,
  }
}
