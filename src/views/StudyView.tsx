import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PartyPopper, Undo2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Deck } from '../db'
import { getStudyQueue, rateCard, type StudyItem } from '../db/study'
import type { Grade } from '../lib/srs'
import {
  parseSessionBatchSize,
  sessionBatchLimit,
} from '@/lib/studyMode'
import { persistDeckFilter } from '@/lib/deckFilter'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ChallengeEngine } from '@/components/challenges/ChallengeEngine'
import { Flashcard } from '@/components/Flashcard'
import { SwipeCardShell } from '@/components/SwipeCardShell'
import {
  awardReviewExp,
  recordStudyActivity,
  useStreak,
} from '@/hooks/useStreak'
import './StudyView.css'

type SessionState = 'CARD' | 'CHALLENGE'

type Feedback = {
  id: number
  text: string
}

/** Scramble UI stays stable only for short answers. */
const CHALLENGE_MAX_BACK_LENGTH = 10

function tryTriggerChallenge(cardBack: string, heroLevel: number): boolean {
  if (cardBack.length > CHALLENGE_MAX_BACK_LENGTH) return false
  const chance = Math.min(0.05 + heroLevel * 0.01, 0.5)
  return Math.random() < chance
}

function GradeButtons({
  onAgain,
  onKnow,
  rating,
  canKnow,
}: {
  onAgain: () => void
  onKnow: () => void
  rating: boolean
  canKnow: boolean
}) {
  return (
    <div
      className={cn('grade-row', !canKnow && 'grade-row-single')}
      role="group"
      aria-label="Rate recall"
    >
      <button
        type="button"
        className="grade-btn grade-again"
        disabled={rating}
        onClick={onAgain}
      >
        Study again
      </button>
      {canKnow ? (
        <button
          type="button"
          className="grade-btn grade-know"
          disabled={rating}
          onClick={onKnow}
        >
          I know
        </button>
      ) : null}
    </div>
  )
}

function StudyFlashcard({
  item,
  revealed,
  onReveal,
  onAgain,
  onKnow,
  rating,
  meta,
  deckColor,
}: {
  item: StudyItem
  revealed: boolean
  onReveal: () => void
  onAgain: () => void
  onKnow: () => void
  rating: boolean
  meta: string
  deckColor?: string
}) {
  const canKnow = !revealed

  return (
    <div className="study-flashcard-stack touch-pan-y">
      <SwipeCardShell
        enabled={!rating}
        allowChallenge={canKnow}
        onSwipeLeft={onAgain}
        onSwipeRight={onKnow}
      >
        <Flashcard
          card={item.card}
          revealed={revealed}
          meta={meta}
          deckColor={deckColor}
          swipeEnabled={false}
          onFlip={onReveal}
        />
      </SwipeCardShell>

      <div className="study-flashcard-actions">
        <GradeButtons
          onAgain={onAgain}
          onKnow={onKnow}
          rating={rating}
          canKnow={canKnow}
        />
        {revealed ? (
          <p className="m-0 text-center text-xs text-muted-foreground">
            Answer is showing — I know is locked. Study again to continue.
          </p>
        ) : (
          <p className="m-0 text-center text-xs text-muted-foreground">
            I know may open a short challenge. Peeking locks I know.
          </p>
        )}
      </div>
    </div>
  )
}

export function StudyView() {
  const navigate = useNavigate()
  const { stats } = useStreak()
  const { deckId: deckIdFromPath } = useParams<{ deckId?: string }>()
  const [searchParams] = useSearchParams()
  const deckIdFromQuery = searchParams.get('deckId')
  const deckId = deckIdFromPath || deckIdFromQuery || undefined
  const batchSize = parseSessionBatchSize(searchParams.get('batch'))

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
  const [sessionState, setSessionState] = useState<SessionState>('CARD')
  const [revealed, setRevealed] = useState(false)
  const [rating, setRating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [doneCount, setDoneCount] = useState(0)
  const [sessionExp, setSessionExp] = useState(0)
  const [moreDueRemaining, setMoreDueRemaining] = useState(false)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const feedbackSeq = useRef(0)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const limit = sessionBatchLimit(batchSize)
    const newCardCap =
      limit === Number.POSITIVE_INFINITY ? undefined : Math.max(20, limit)
    void getStudyQueue(deckId, newCardCap)
      .then((batch) => {
        if (cancelled) return
        const sessionBatch =
          limit === Number.POSITIVE_INFINITY ? batch : batch.slice(0, limit)
        setSessionQueue(sessionBatch)
        setMoreDueRemaining(batch.length > sessionBatch.length)
        setSessionState('CARD')
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
  }, [deckId, batchSize])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  function spawnFeedback(text: string) {
    feedbackSeq.current += 1
    const id = Date.now() + feedbackSeq.current
    setFeedback((prev) => [...prev, { id, text }])
    const hide = window.setTimeout(() => {
      setFeedback((prev) => prev.filter((item) => item.id !== id))
    }, 1000)
    timeoutsRef.current.push(hide)
  }

  const current = sessionQueue[0]
  const finished = sessionState === 'CARD' && !current
  const sessionComplete = finished && doneCount > 0

  async function finishCard(grade: Grade) {
    if (!current || rating) return

    setRating(true)
    try {
      const wasNew = !current.review || current.review.state === 'new'
      await rateCard(current.card.id, grade, current.review)
      const award = await awardReviewExp(grade, wasNew)
      if (award.expGained > 0) {
        spawnFeedback(`+${award.expGained} EXP`)
        setSessionExp((value) => value + award.expGained)
      } else {
        spawnFeedback('Needs review')
      }
      if (award.leveledUp) {
        toast.success(`Level ${award.newLevel}`)
      }

      await recordStudyActivity()
      setDoneCount((n) => n + 1)
      setSessionQueue((prev) => prev.slice(1))
      setRevealed(false)
      setSessionState('CARD')
    } finally {
      setRating(false)
    }
  }

  function onKnow() {
    if (!current || rating || revealed) return
    if (tryTriggerChallenge(current.card.back, stats.level)) {
      setSessionState('CHALLENGE')
      return
    }
    void finishCard(3)
  }

  function handleChallengeComplete(isSuccess: boolean) {
    void finishCard(isSuccess ? 3 : 1)
  }

  if ((deckId && deck === undefined) || loading) {
    return <p className="empty-state">Loading study session…</p>
  }

  if (deckId && deck === null) {
    return (
      <section>
        <p className="empty-state">Deck not found.</p>
        <Link to="/cards" className="back-link">
          Return home
        </Link>
      </section>
    )
  }

  const cardDeckName =
    (current?.card.deckId
      ? deckById.get(current.card.deckId)?.name
      : undefined) ??
    deck?.name ??
    'All Cards'
  const cardMeta = current
    ? `${cardDeckName} / ${String(doneCount + 1).padStart(3, '0')}`
    : ''
  const currentDeckColor =
    deck?.color ??
    (current?.card.deckId
      ? deckById.get(current.card.deckId)?.color
      : undefined)

  function returnHome() {
    if (deckId) persistDeckFilter(deckId)
    navigate('/cards')
  }

  return (
    <section className="study-view relative">
      {finished ? null : (
        <div className="dungeon-dock">
          <button
            type="button"
            className="dungeon-dock-run"
            onClick={returnHome}
          >
            <Undo2 className="size-5" aria-hidden />
            Leave
          </button>
        </div>
      )}

      <header className="view-header">
        <h1>
          {sessionComplete
            ? 'Session complete'
            : sessionState === 'CHALLENGE'
              ? 'Prove it!'
              : 'Study'}
        </h1>
        <p>
          {sessionComplete
            ? `Reviewed ${doneCount} card${doneCount === 1 ? '' : 's'}.`
            : finished
              ? 'Nothing due right now.'
              : sessionState === 'CHALLENGE'
                ? 'Pass the challenge without peeking at the answer.'
                : `${sessionQueue.length} remaining · ${doneCount} done`}
        </p>
      </header>

      <div className="study-card-stage">
        {finished ? (
          <div className="study-complete">
            {sessionComplete ? (
              <>
                <PartyPopper className="session-complete-icon size-5" aria-hidden />
                <p className="empty-state">Nice work. Progress is saved.</p>
                <p className="session-exp">Earned: +{sessionExp} EXP</p>
                {moreDueRemaining ? (
                  <p className="m-0 text-center text-sm text-muted-foreground">
                    There are still more cards due. Come back after a break.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="empty-state">
                Add cards or wait until reviews are due.
              </p>
            )}
            <div className="study-actions">
              <button type="button" className="back-link" onClick={returnHome}>
                Return home
              </button>
            </div>
          </div>
        ) : current && sessionState === 'CHALLENGE' ? (
          <ChallengeEngine
            key={`challenge-${current.card.id}-${doneCount}`}
            card={current.card}
            busy={rating}
            onComplete={handleChallengeComplete}
          />
        ) : current ? (
          <StudyFlashcard
            key={`${current.card.id}-${doneCount}`}
            item={current}
            revealed={revealed}
            onReveal={() => setRevealed((value) => !value)}
            onAgain={() => void finishCard(1)}
            onKnow={onKnow}
            rating={rating}
            meta={cardMeta}
            deckColor={currentDeckColor}
          />
        ) : null}
        <div
          className="pointer-events-none absolute left-1/2 top-[38%] z-20 -translate-x-1/2"
          aria-live="polite"
        >
          {feedback.map((item) => (
            <span
              key={item.id}
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-yellow-400 font-bold text-xl drop-shadow-md animate-floatUp"
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
