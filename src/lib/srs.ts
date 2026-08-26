/** Evaluation grade: 1 Again, 2 Hard, 3 Good, 4 Easy. */
export type Grade = 1 | 2 | 3 | 4

export const GRADE_LABELS: Record<Grade, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
}
