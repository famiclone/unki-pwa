import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getStudyQueue, rateCard, type StudyItem } from '../db/study'
import type { Grade } from '../lib/srs'
import { Flashcard } from '@/components/Flashcard'
import { recordStudyActivity } from '@/hooks/useStreak'
import './StudyView.css'

const STUDY_ACTIONS: Array<{ grade: Grade; label: string; className: string }> =
  [
    { grade: 1, label: 'Study again', className: 'grade-btn grade-again' },
    { grade: 3, label: 'I know', className: 'grade-btn grade-know' },
  ]

function GradeButtons({
  onRate,
  rating,
}: {
  onRate: (grade: Grade) => void
  rating: boolean
}) {
  return (
    <div className="grade-row" role="group" aria-label="Rate recall">
      {STUDY_ACTIONS.map(({ grade, label, className }) => (
        <button
          key={grade}
          type="button"
          className={className}
          disabled={rating}
          onClick={() => onRate(grade)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function StudyFlashcard({
  item,
  revealed,
  onReveal,
  onRate,
  rating,
  meta,
}: {
  item: StudyItem
  revealed: boolean
  onReveal: () => void
  onRate: (grade: Grade) => void
  rating: boolean
  meta: string
}) {
  return (
    <div className="study-flashcard-stack">
      <Flashcard
        card={item.card}
        revealed={revealed}
        meta={meta}
        onFlip={onReveal}
      />

      {revealed ? (
        <div className="study-flashcard-actions">
          <GradeButtons onRate={onRate} rating={rating} />
        </div>
      ) : null}
    </div>
  )
}

export function StudyView() {
  const { deckId: deckIdFromPath } = useParams<{ deckId?: string }>()
  const [searchParams] = useSearchParams()
  const deckIdFromQuery = searchParams.get('deckId')
  const deckId = deckIdFromPath || deckIdFromQuery || undefined

  const deck = useLiveQuery(async () => {
    if (!deckId) return null
    return (await db.decks.get(deckId)) ?? null
  }, [deckId])

  const [queue, setQueue] = useState<StudyItem[]>([])
  const [revealed, setRevealed] = useState(false)
  const [rating, setRating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [doneCount, setDoneCount] = useState(0)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const nextQueue = await getStudyQueue(deckId)
      setQueue(nextQueue)
      setRevealed(false)
      setDoneCount(0)
    } finally {
      setLoading(false)
    }
  }, [deckId])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const current = queue[0]

  async function handleRate(grade: Grade) {
    if (!current || rating) return

    setRating(true)
    try {
      const updated = await rateCard(current.card.id, grade, current.review)
      await recordStudyActivity()
      setDoneCount((n) => n + 1)
      setQueue((prev) => {
        const rest = prev.slice(1)
        if (grade === 1) {
          return [...rest, { card: current.card, review: updated }]
        }
        return rest
      })
      setRevealed(false)
    } finally {
      setRating(false)
    }
  }

  const backLabel = deck?.name ?? 'All Cards'

  if ((deckId && deck === undefined) || loading) {
    return <p className="empty-state">Loading study session…</p>
  }

  if (deckId && deck === null) {
    return (
      <section>
        <p className="empty-state">Deck not found.</p>
        <Link to="/" className="back-link">
          <ArrowLeft size={16} aria-hidden />
          Back to cards
        </Link>
      </section>
    )
  }

  const finished = !current
  const cardMeta = current
    ? `${backLabel} / ${String(doneCount + 1).padStart(3, '0')}`
    : ''

  return (
    <section className="study-view">
      <Link to="/" className="text-back">
        <ArrowLeft size={16} aria-hidden />
        {backLabel}
      </Link>

      <header className="view-header">
        <h1>Study</h1>
        <p>
          {finished
            ? doneCount > 0
              ? `Session complete — reviewed ${doneCount} card${doneCount === 1 ? '' : 's'}.`
              : 'Nothing due right now.'
            : `${queue.length} remaining · ${doneCount} done`}
        </p>
      </header>

      {finished ? (
        <div className="study-complete">
          <p className="empty-state">
            {doneCount > 0
              ? 'Nice work. Come back when more cards are due.'
              : 'Add cards or wait until reviews are due.'}
          </p>
          <div className="study-actions">
            <button
              type="button"
              className="refresh-btn"
              onClick={() => void loadQueue()}
            >
              Refresh queue
            </button>
            <Link to="/" className="back-link">
              All cards
            </Link>
          </div>
        </div>
      ) : (
        <StudyFlashcard
          item={current}
          revealed={revealed}
          onReveal={() => setRevealed((value) => !value)}
          onRate={handleRate}
          rating={rating}
          meta={cardMeta}
        />
      )}
    </section>
  )
}
