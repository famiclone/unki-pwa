import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PartyPopper, Undo2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Card, type Deck } from '../db'
import { getStudyQueue, rateCard, type StudyItem } from '../db/study'
import type { Grade } from '../lib/srs'
import {
  parseSessionBatchSize,
  sessionBatchLimit,
} from '@/lib/studyMode'
import { persistDeckFilter } from '@/lib/deckFilter'
import { toast } from 'sonner'
import { ChallengeEngine } from '@/components/challenges/ChallengeEngine'
import { MatchChallenge } from '@/components/challenges/MatchChallenge'
import { Button } from '@/components/ui/button'
import { Flashcard } from '@/components/Flashcard'
import { SwipeCardShell } from '@/components/SwipeCardShell'
import {
  awardReviewExp,
  recordStudyActivity,
  useStreak,
} from '@/hooks/useStreak'
import { isNewCard } from '@/lib/fsrsService'
import './StudyView.css'

type SessionState = 'CARD' | 'CHALLENGE' | 'MATCH'

type Feedback = {
  id: number
  text: string
}

/** Scramble / type challenges stay stable only for short sides. */
const CHALLENGE_MAX_BACK_LENGTH = 10
const CHALLENGE_MAX_TERM_CHARS = 16

/** Pause after grading so feedback can read before the next card. */
const CARD_ADVANCE_DELAY_MS = 650

/** Map front-of-card recall time to FSRS Hard / Good / Easy grades. */
function gradeFromRecallMs(elapsedMs: number): Grade {
  const seconds = elapsedMs / 1000
  if (seconds < 3) return 4
  if (seconds < 8) return 3
  return 2
}

function successFeedbackLabel(grade: Grade, expGained: number): string {
  if (grade === 4) return `Perfect! (+${expGained} EXP)`
  if (grade === 3) return `Good! (+${expGained} EXP)`
  if (grade === 2) return `Hard (+${expGained} EXP)`
  return `+${expGained} EXP`
}

function tryTriggerChallenge(card: Card, heroLevel: number): boolean {
  const backOk = card.back.trim().length <= CHALLENGE_MAX_BACK_LENGTH
  const termLen = Array.from(card.front.trim()).length
  const scrambleOk = termLen >= 2 && termLen <= CHALLENGE_MAX_TERM_CHARS
  if (!backOk && !scrambleOk) return false
  // Base 20% + 2.5%/level, capped at 70%.
  const chance = Math.min(0.2 + heroLevel * 0.025, 0.7)
  return Math.random() < chance
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
  demoSwipe,
}: {
  item: StudyItem
  revealed: boolean
  onReveal: () => void
  onAgain: () => void
  onKnow: () => void
  rating: boolean
  meta: string
  deckColor?: string
  demoSwipe?: boolean
}) {
  return (
    <div className="study-flashcard-stack touch-pan-y">
      <SwipeCardShell
        enabled={!rating}
        demoSwipe={demoSwipe}
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

      <p className="m-0 text-center text-xs text-muted-foreground">
        {revealed
          ? 'Swipe right if you know it, left if you don’t.'
          : 'Tap to flip · swipe right = I know · left = Study again'}
      </p>
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
  const [fullSessionCards, setFullSessionCards] = useState<Card[]>([])
  const [sessionState, setSessionState] = useState<SessionState>('CARD')
  const [revealed, setRevealed] = useState(false)
  const [cardStartTime, setCardStartTime] = useState(() => Date.now())
  const [recallDuration, setRecallDuration] = useState(0)
  const [rating, setRating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [doneCount, setDoneCount] = useState(0)
  const [sessionExp, setSessionExp] = useState(0)
  const [moreDueRemaining, setMoreDueRemaining] = useState(false)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const feedbackSeq = useRef(0)
  const timeoutsRef = useRef<number[]>([])
  /** Show match interrupt when doneCount hits this (null = none this session). */
  const [matchAtDone, setMatchAtDone] = useState<number | null>(null)
  const [matchCleared, setMatchCleared] = useState(false)

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
        setFullSessionCards(sessionBatch.map((item) => item.card))
        setMoreDueRemaining(batch.length > sessionBatch.length)
        setSessionState('CARD')
        setRevealed(false)
        setRecallDuration(0)
        setCardStartTime(Date.now())
        setDoneCount(0)
        setSessionExp(0)
        setMatchCleared(false)
        // Random step, but keep ≥ 4 cards remaining when it appears.
        setMatchAtDone(
          sessionBatch.length >= 4
            ? Math.floor(Math.random() * (sessionBatch.length - 3))
            : null,
        )
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

  const current = sessionQueue[0]
  const finished = sessionState === 'CARD' && !current
  const sessionComplete = finished && doneCount > 0

  // Insert match challenge at the scheduled step (not later than 4 cards left).
  useEffect(() => {
    if (loading || matchCleared || matchAtDone === null) return
    if (sessionState !== 'CARD') return
    if (doneCount !== matchAtDone) return
    if (sessionQueue.length < 4) return
    setSessionState('MATCH')
  }, [
    loading,
    matchCleared,
    matchAtDone,
    sessionState,
    doneCount,
    sessionQueue.length,
  ])

  // Reset recall timer whenever the front of a new card is shown.
  useEffect(() => {
    if (!current || sessionState !== 'CARD') return
    setCardStartTime(Date.now())
    setRecallDuration(0)
    setRevealed(false)
  }, [current?.card.id, sessionState])

  function spawnFeedback(text: string) {
    feedbackSeq.current += 1
    const id = Date.now() + feedbackSeq.current
    setFeedback((prev) => [...prev, { id, text }])
    const hide = window.setTimeout(() => {
      setFeedback((prev) => prev.filter((item) => item.id !== id))
    }, 1000)
    timeoutsRef.current.push(hide)
  }

  function handleReveal() {
    setRevealed((wasRevealed) => {
      if (!wasRevealed) {
        setRecallDuration(Date.now() - cardStartTime)
      }
      return !wasRevealed
    })
  }

  async function finishCard(grade: Grade) {
    if (!current || rating) return

    setRating(true)
    try {
      const wasNew = isNewCard(current.card)
      await rateCard(current.card.id, grade, current.card)
      const award = await awardReviewExp(grade, wasNew)
      if (award.expGained > 0) {
        spawnFeedback(successFeedbackLabel(grade, award.expGained))
        setSessionExp((value) => value + award.expGained)
      } else {
        spawnFeedback('Needs review')
      }
      if (award.leveledUp) {
        toast.success(`Level ${award.newLevel}`)
      }

      await recordStudyActivity()

      await new Promise<void>((resolve) => {
        const advance = window.setTimeout(() => resolve(), CARD_ADVANCE_DELAY_MS)
        timeoutsRef.current.push(advance)
      })

      setDoneCount((n) => n + 1)
      setSessionQueue((prev) => prev.slice(1))
      setRevealed(false)
      setRecallDuration(0)
      setSessionState('CARD')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save rating',
      )
    } finally {
      setRating(false)
    }
  }

  function onKnow() {
    if (!current || rating) return
    if (!revealed && tryTriggerChallenge(current.card, stats.level)) {
      setSessionState('CHALLENGE')
      return
    }
    const elapsedMs =
      recallDuration > 0 ? recallDuration : Date.now() - cardStartTime
    void finishCard(gradeFromRecallMs(elapsedMs))
  }

  function handleChallengeComplete(isSuccess: boolean) {
    // Challenges ignore the recall timer; success is always a solid Good.
    void finishCard(isSuccess ? 3 : 1)
  }

  async function handleMatchComplete() {
    setMatchCleared(true)
    setSessionState('CARD')
    try {
      const award = await awardReviewExp(3, false)
      if (award.expGained > 0) {
        spawnFeedback(`Match clear! (+${award.expGained} EXP)`)
        setSessionExp((value) => value + award.expGained)
      }
      if (award.leveledUp) {
        toast.success(`Level ${award.newLevel}`)
      }
    } catch {
      spawnFeedback('Match clear!')
    }
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
        <button
          type="button"
          className="study-leave"
          onClick={returnHome}
        >
          <Undo2 className="size-5" aria-hidden />
          Leave
        </button>
      )}

      <header className="view-header">
        <p>
          {sessionComplete
            ? `Reviewed ${doneCount} card${doneCount === 1 ? '' : 's'}.`
            : finished
              ? 'Nothing due right now.'
              : sessionState === 'CHALLENGE'
                ? 'Pass the challenge without peeking at the answer.'
                : sessionState === 'MATCH'
                  ? 'Connect each prompt with its answer.'
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
              <Button
                type="button"
                className="h-16 w-full rounded-xl text-xl shadow-lg"
                onClick={returnHome}
              >
                Return home
              </Button>
            </div>
          </div>
        ) : sessionState === 'MATCH' && sessionQueue.length >= 4 ? (
          <MatchChallenge
            key={`match-${doneCount}-${matchAtDone}`}
            remainingCards={sessionQueue.map((item) => item.card)}
            onComplete={() => void handleMatchComplete()}
          />
        ) : current && sessionState === 'CHALLENGE' ? (
          <ChallengeEngine
            key={`challenge-${current.card.id}`}
            card={current.card}
            deckCards={fullSessionCards}
            busy={rating}
            onComplete={handleChallengeComplete}
          />
        ) : current ? (
          <StudyFlashcard
            key={current.card.id}
            item={current}
            revealed={revealed}
            onReveal={handleReveal}
            onAgain={() => void finishCard(1)}
            onKnow={onKnow}
            rating={rating}
            meta={cardMeta}
            deckColor={currentDeckColor}
            demoSwipe={
              doneCount === 0 && (matchAtDone !== 0 || matchCleared)
            }
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
