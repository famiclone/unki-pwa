import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade as FsrsGrade,
} from 'ts-fsrs'

export { Rating, State }
export type { FsrsCard }

/** FSRS fields stored on Dexie cards (`due` / `last_review` as Unix ms). */
export type FsrsSchedulerFields = {
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  learning_steps: number
  state: State
  last_review?: number
}

const scheduler = fsrs({ maximum_interval: 36500 })

function toTimestamp(value: Date | number | string | undefined): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'number') return value
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

/** Map stored scheduler fields into a ts-fsrs Card. */
export function toFsrsCard(fields: FsrsSchedulerFields): FsrsCard {
  return {
    due: new Date(fields.due),
    stability: fields.stability,
    difficulty: fields.difficulty,
    elapsed_days: fields.elapsed_days,
    scheduled_days: fields.scheduled_days,
    reps: fields.reps,
    lapses: fields.lapses,
    learning_steps: fields.learning_steps,
    state: fields.state,
    last_review:
      fields.last_review != null ? new Date(fields.last_review) : undefined,
  }
}

/** Convert a ts-fsrs Card into Dexie-friendly scheduler fields. */
export function fromFsrsCard(fsrsCard: FsrsCard): FsrsSchedulerFields {
  const lastReview = toTimestamp(fsrsCard.last_review)
  return {
    due: new Date(fsrsCard.due).getTime(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsed_days: fsrsCard.elapsed_days,
    scheduled_days: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    learning_steps: fsrsCard.learning_steps,
    state: fsrsCard.state,
    ...(lastReview != null ? { last_review: lastReview } : {}),
  }
}

/** Default FSRS scheduler fields for a brand-new card. */
export function createNewFSRSCard(now = new Date()): FsrsSchedulerFields {
  return fromFsrsCard(createEmptyCard(now))
}

/**
 * Grade scheduler fields with FSRS.
 * Again → Rating.Again; I know / challenge success → Rating.Good.
 */
export function gradeFsrsFields(
  fields: FsrsSchedulerFields,
  rating: Rating.Again | Rating.Good | Rating.Hard | Rating.Easy,
  now = new Date(),
): FsrsSchedulerFields {
  const record = scheduler.next(toFsrsCard(fields), now, rating as FsrsGrade)
  return fromFsrsCard(record.card)
}

/** Merge graded FSRS fields onto any card-shaped object. */
export function gradeCard<T extends FsrsSchedulerFields>(
  card: T,
  rating: Rating.Again | Rating.Good | Rating.Hard | Rating.Easy,
  now = new Date(),
): T {
  const next = gradeFsrsFields(card, rating, now)
  const merged: T = { ...card, ...next }
  if (next.last_review == null) {
    delete (merged as { last_review?: number }).last_review
  }
  return merged
}

/** UI / gamification grade (1 Again … 4 Easy) → FSRS Rating. */
export function gradeToRating(
  grade: 1 | 2 | 3 | 4,
): Rating.Again | Rating.Hard | Rating.Good | Rating.Easy {
  switch (grade) {
    case 1:
      return Rating.Again
    case 2:
      return Rating.Hard
    case 3:
      return Rating.Good
    case 4:
      return Rating.Easy
  }
}

export function isNewCard(fields: Pick<FsrsSchedulerFields, 'state'>): boolean {
  return fields.state === State.New
}

/** Hub / stats filter bucket from FSRS State. */
export function uiStateFromFsrs(state: State): 'new' | 'learning' | 'review' {
  if (state === State.New) return 'new'
  if (state === State.Review) return 'review'
  return 'learning'
}

export function cardMatchesUiState(
  fields: Pick<FsrsSchedulerFields, 'state'>,
  filter: 'new' | 'learning' | 'review',
): boolean {
  return uiStateFromFsrs(fields.state) === filter
}
