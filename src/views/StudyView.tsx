import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, PartyPopper } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Deck } from '../db'
import { getStudyQueue, rateCard, type StudyItem } from '../db/study'
import type { Grade } from '../lib/srs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Flashcard } from '@/components/Flashcard'
import { HeartsDisplay } from '@/components/HeartsDisplay'
import { awardReviewExp, recordStudyActivity, useStreak } from '@/hooks/useStreak'
import './StudyView.css'

type CombatFeedback = {
  id: number
  text: string
  type: 'damage' | 'heal' | 'exp'
}

const FEEDBACK_CLASS: Record<CombatFeedback['type'], string> = {
  damage: 'text-red-500 font-bold text-2xl drop-shadow-md animate-floatUp',
  heal: 'text-green-400 font-bold text-xl drop-shadow-md animate-floatUp',
  exp: 'text-yellow-400 font-bold text-xl drop-shadow-md animate-floatUp',
}

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

  const [sessionQueue, setSessionQueue] = useState<StudyItem[]>([])
  const [revealed, setRevealed] = useState(false)
  const [rating, setRating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [doneCount, setDoneCount] = useState(0)
  const [sessionExp, setSessionExp] = useState(0)
  const [feedback, setFeedback] = useState<CombatFeedback[]>([])
  const [shaking, setShaking] = useState(false)
  const feedbackSeq = useRef(0)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getStudyQueue(deckId)
      .then((batch) => {
        if (cancelled) return
        setSessionQueue(batch)
        setRevealed(false)
        setDoneCount(0)
        setSessionExp(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [deckId])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  function spawnFeedback(text: string, type: CombatFeedback['type']) {
    feedbackSeq.current += 1
    const id = Date.now() + feedbackSeq.current
    setFeedback((prev) => [...prev, { id, text, type }])
    const hide = window.setTimeout(() => {
      setFeedback((prev) => prev.filter((item) => item.id !== id))
    }, 1000)
    timeoutsRef.current.push(hide)
  }

  function triggerShake() {
    setShaking(false)
    const start = window.setTimeout(() => setShaking(true), 0)
    const stop = window.setTimeout(() => setShaking(false), 400)
    timeoutsRef.current.push(start, stop)
  }

  const current = sessionQueue[0]

  async function handleRateCard(grade: Grade) {
    if (!current || rating) return

    setRating(true)
    try {
      const wasNew = !current.review || current.review.state === 'new'
      const answeringExhausted = stats.isExhausted
      const willExhaust =
        answeringExhausted || (grade === 1 && stats.hearts <= 1)
      await rateCard(current.card.id, grade, current.review, {
        exhausted: willExhaust,
      })
      const award = await awardReviewExp(grade, wasNew)
      if (award.leveledUp) {
        toast.success(`🎉 Level Up! You are now Level ${award.newLevel}!`)
      }
      if (award.becameExhausted) {
        toast.error('Exhausted — attack bonus is off until you recover a heart.')
      } else if (award.recovered) {
        toast.success('A heart returns. You’re no longer exhausted.')
      }

      if (grade === 1) {
        spawnFeedback('-1 ❤️', 'damage')
        triggerShake()
      } else if (grade === 3 || grade === 4) {
        spawnFeedback(
          answeringExhausted
            ? `+${award.expGained} EXP (No ATK bonus)`
            : `+${award.expGained} EXP`,
          'exp',
        )
        if (stats.hearts < stats.maxHearts) {
          const heal = window.setTimeout(() => {
            spawnFeedback('+0.5 ❤️', 'heal')
          }, 150)
          timeoutsRef.current.push(heal)
        }
      }

      await recordStudyActivity()
      setDoneCount((n) => n + 1)
      setSessionExp((n) => n + award.expGained)
      setSessionQueue((prev) => prev.slice(1))
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
    <section className={cn('study-view relative', shaking && 'animate-shake')}>
      <Link to={deckId ? `/decks/${deckId}` : '/cards'} className="text-back">
        <ArrowLeft size={16} aria-hidden />
        {backLabel}
      </Link>

      <header className="view-header">
        <h1>{finished && doneCount > 0 ? 'Session Complete!' : 'Study'}</h1>
        <p>
          {finished
            ? doneCount > 0
              ? `Reviewed ${doneCount} card${doneCount === 1 ? '' : 's'}.`
              : 'Nothing due right now.'
            : `${sessionQueue.length} remaining · ${doneCount} done`}
        </p>
        {finished ? null : (
          <div className="study-hp">
            <HeartsDisplay stats={stats} compact />
          </div>
        )}
      </header>

      <div className="study-card-stage">
        {finished ? (
          <div className="study-complete">
            {doneCount > 0 ? (
              <>
                <PartyPopper className="session-complete-icon" size={36} aria-hidden />
                <p className="empty-state">
                  Nice work. Missed cards come back in 5 minutes
                  {stats.isExhausted ? ', or after a longer rest if you’re exhausted' : ''}.
                </p>
                <p className="session-exp">+{sessionExp} EXP this session</p>
              </>
            ) : (
              <p className="empty-state">
                Add cards or wait until reviews are due.
              </p>
            )}
            <div className="study-actions">
              <Link to="/cards" className="back-link">
                Return to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <StudyFlashcard
            key={`${current.card.id}-${doneCount}`}
            item={current}
            revealed={revealed}
            onReveal={() => setRevealed((value) => !value)}
            onRate={handleRateCard}
            rating={rating}
            meta={cardMeta}
            deckColor={currentDeckColor}
          />
        )}
        <div
          className="pointer-events-none absolute left-1/2 top-[38%] z-20 -translate-x-1/2"
          aria-live="polite"
        >
          {feedback.map((item) => (
            <span
              key={item.id}
              className={cn(
                'absolute left-1/2 -translate-x-1/2 whitespace-nowrap',
                FEEDBACK_CLASS[item.type],
                item.type === 'exp' &&
                  item.text.includes('No ATK bonus') &&
                  'text-sm text-gray-400',
              )}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
