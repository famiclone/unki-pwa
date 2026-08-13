import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Deck } from '../db'
import { getStudyQueue, rateCard, type StudyItem } from '../db/study'
import type { Grade } from '../lib/srs'
import { toast } from 'sonner'
import { Flashcard } from '@/components/Flashcard'
import { HeartsDisplay } from '@/components/HeartsDisplay'
import { awardReviewExp, recordStudyActivity, useStreak } from '@/hooks/useStreak'
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
  deckColor,
}: {
  item: StudyItem
  revealed: boolean
  onReveal: () => void
  onRate: (grade: Grade) => void
  rating: boolean
  meta: string
  deckColor?: string
}) {
  return (
    <div className="study-flashcard-stack touch-pan-y">
      <Flashcard
        card={item.card}
        revealed={revealed}
        meta={meta}
        deckColor={deckColor}
        swipeEnabled={revealed && !rating}
        onFlip={onReveal}
        onSwipeLeft={() => onRate(1)}
        onSwipeRight={() => onRate(3)}
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
  const { stats } = useStreak()
  const { deckId: deckIdFromPath } = useParams<{ deckId?: string }>()
  const [searchParams] = useSearchParams()
  const deckIdFromQuery = searchParams.get('deckId')
  const deckId = deckIdFromPath || deckIdFromQuery || undefined

  const deck = useLiveQuery(async () => {
    if (!deckId) return null
    return (await db.decks.get(deckId)) ?? null
  }, [deckId])
  const decks = useLiveQuery(() => db.decks.toArray(), [])
  const deckById = useMemo(() => {
    const map = new Map<string, Deck>()
    for (const item of decks ?? []) map.set(item.id, item)
    return map
  }, [decks])

  const [queue, setQueue] = useState<StudyItem[]>([])
  const [revealed, setRevealed] = useState(false)
  const [rating, setRating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [doneCount, setDoneCount] = useState(0)
  const [expBurst, setExpBurst] = useState<{ id: number; amount: number } | null>(
    null,
  )

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
      const wasNew = !current.review || current.review.state === 'new'
      const updated = await rateCard(current.card.id, grade, current.review)
      const award = await awardReviewExp(grade, wasNew)
      if (award.leveledUp) {
        toast.success(`🎉 Level Up! You are now Level ${award.newLevel}!`)
      }
      if (award.becameExhausted) {
        toast.error('Exhausted — attack bonus is off until you recover a heart.')
      } else if (award.recovered) {
        toast.success('A heart returns. You’re no longer exhausted.')
      }
      if (award.expGained > 0 && (grade === 3 || grade === 4)) {
        setExpBurst({ id: Date.now(), amount: award.expGained })
      }
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
        <Link to="/cards" className="back-link">
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
  const currentDeckColor =
    deck?.color ??
    (current?.card.deckId
      ? deckById.get(current.card.deckId)?.color
      : undefined)

  return (
    <section className="study-view">
      <Link to={deckId ? `/decks/${deckId}` : '/cards'} className="text-back">
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
        <div className="study-hp">
          <HeartsDisplay stats={stats} compact />
        </div>
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
            <Link to="/cards" className="back-link">
              All cards
            </Link>
          </div>
        </div>
      ) : (
        <div className="study-card-stage">
          <StudyFlashcard
            key={`${current.card.id}-${doneCount}`}
            item={current}
            revealed={revealed}
            onReveal={() => setRevealed((value) => !value)}
            onRate={handleRate}
            rating={rating}
            meta={cardMeta}
            deckColor={currentDeckColor}
          />
          {expBurst ? (
            <span
              key={expBurst.id}
              className="exp-burst"
              aria-live="polite"
              onAnimationEnd={() => setExpBurst(null)}
            >
              + {expBurst.amount} EXP
            </span>
          ) : null}
        </div>
      )}
    </section>
  )
}
