import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, PartyPopper } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addInventoryItem, applyItemEffect, db, type Deck } from '../db'
import { getStudyQueue, rateCard, type StudyItem } from '../db/study'
import type { Grade } from '../lib/srs'
import { CHEST_DROP_CHANCE, pickRandomLoot, type Item } from '@/lib/items'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ChestEncounter } from '@/components/ChestEncounter'
import { Flashcard } from '@/components/Flashcard'
import { HeartsDisplay } from '@/components/HeartsDisplay'
import { LootReveal } from '@/components/LootReveal'
import { awardReviewExp, recordStudyActivity, useStreak } from '@/hooks/useStreak'
import './StudyView.css'

type SessionState = 'CARD' | 'CHEST' | 'LOOT'

type CombatFeedback = {
  id: number
  text: string
  type: 'damage' | 'heal' | 'exp' | 'loot'
}

const FEEDBACK_CLASS: Record<CombatFeedback['type'], string> = {
  damage: 'text-red-500 font-bold text-2xl drop-shadow-md animate-floatUp',
  heal: 'text-green-400 font-bold text-xl drop-shadow-md animate-floatUp',
  exp: 'text-yellow-400 font-bold text-xl drop-shadow-md animate-floatUp',
  loot: 'text-amber-400 font-bold text-xl drop-shadow-md animate-floatUp',
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
  const [sessionState, setSessionState] = useState<SessionState>('CARD')
  const [currentLoot, setCurrentLoot] = useState<Item | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [rating, setRating] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [doneCount, setDoneCount] = useState(0)
  const [sessionExp, setSessionExp] = useState(0)
  const [feedback, setFeedback] = useState<CombatFeedback[]>([])
  const [shaking, setShaking] = useState(false)
  const [damageFlash, setDamageFlash] = useState(false)
  const feedbackSeq = useRef(0)
  const timeoutsRef = useRef<number[]>([])
  const trapResolved = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getStudyQueue(deckId)
      .then((batch) => {
        if (cancelled) return
        setSessionQueue(batch)
        setSessionState('CARD')
        setCurrentLoot(null)
        setRevealed(false)
        setDoneCount(0)
        setSessionExp(0)
        trapResolved.current = false
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

  function triggerDamageFlash() {
    setDamageFlash(false)
    const start = window.setTimeout(() => setDamageFlash(true), 0)
    const stop = window.setTimeout(() => setDamageFlash(false), 450)
    timeoutsRef.current.push(start, stop)
  }

  function returnToCards() {
    setCurrentLoot(null)
    setSessionState('CARD')
    trapResolved.current = false
  }

  function feedbackFromEffect(result: {
    heartsDelta: number
    expDelta: number
    message: string
    leveledUp: boolean
    recovered: boolean
    becameExhausted: boolean
    newLevel?: number
    stats: { level: number }
  }) {
    if (result.heartsDelta > 0) {
      spawnFeedback(`+${result.heartsDelta} ❤️`, 'heal')
    } else if (result.heartsDelta < 0) {
      spawnFeedback(result.message || `${result.heartsDelta} ❤️`, 'damage')
    }
    if (result.expDelta > 0) {
      spawnFeedback(`+${result.expDelta} EXP`, 'exp')
      setSessionExp((n) => n + result.expDelta)
    }
    if (result.leveledUp) {
      toast.success(`🎉 Level Up! You are now Level ${result.stats.level}!`)
    }
    if (result.becameExhausted) {
      toast.error('Exhausted — restore a heart with a Health Potion.')
    } else if (result.recovered) {
      toast.success('A heart returns. You’re no longer exhausted.')
    }
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
        toast.error('Exhausted — restore a heart with a Health Potion.')
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
        if (award.coinsGained > 0) {
          const loot = window.setTimeout(() => {
            spawnFeedback(`+${award.coinsGained} 🪙`, 'loot')
          }, 150)
          timeoutsRef.current.push(loot)
        }
      }

      await recordStudyActivity()
      setDoneCount((n) => n + 1)
      setSessionExp((n) => n + award.expGained)
      setSessionQueue((prev) => prev.slice(1))
      setRevealed(false)

      const foundChest =
        (grade === 3 || grade === 4) && Math.random() < CHEST_DROP_CHANCE
      if (foundChest) {
        setCurrentLoot(pickRandomLoot())
        setSessionState('CHEST')
      } else {
        setCurrentLoot(null)
        setSessionState('CARD')
      }
    } finally {
      setRating(false)
    }
  }

  function openChest() {
    if (sessionState !== 'CHEST' || !currentLoot) return
    const loot = currentLoot
    trapResolved.current = false
    setSessionState('LOOT')
    if (loot.type === 'trap') {
      void springTrap(loot)
    }
  }

  async function springTrap(loot: Item) {
    if (trapResolved.current) return
    trapResolved.current = true
    try {
      const result = await applyItemEffect(loot.id)
      triggerShake()
      triggerDamageFlash()
      feedbackFromEffect(result)
    } catch {
      trapResolved.current = false
      toast.error('The trap fizzled')
    }
  }

  async function handleUseLoot() {
    if (sessionState !== 'LOOT' || !currentLoot || claiming) return
    if (currentLoot.type === 'trap') return
    setClaiming(true)
    try {
      const result = await applyItemEffect(currentLoot.id)
      feedbackFromEffect(result)
      returnToCards()
    } catch {
      toast.error('Could not use the item')
    } finally {
      setClaiming(false)
    }
  }

  async function handleStashLoot() {
    if (sessionState !== 'LOOT' || !currentLoot || claiming) return
    if (currentLoot.type === 'trap') return
    setClaiming(true)
    try {
      await addInventoryItem(currentLoot.id)
      toast.success(`${currentLoot.name} added to your bag`)
      returnToCards()
    } catch {
      toast.error('Could not stash the loot')
    } finally {
      setClaiming(false)
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

  const onCard = sessionState === 'CARD'
  const finished = onCard && !current
  const cardMeta = current
    ? `${backLabel} / ${String(doneCount + 1).padStart(3, '0')}`
    : ''
  const currentDeckColor =
    deck?.color ??
    (current?.card.deckId
      ? deckById.get(current.card.deckId)?.color
      : undefined)

  return (
    <section
      className={cn(
        'study-view relative',
        shaking && 'animate-shake',
      )}
    >
      <Link to={deckId ? `/decks/${deckId}` : '/cards'} className="text-back">
        <ArrowLeft size={16} aria-hidden />
        {backLabel}
      </Link>

      <header className="view-header">
        <h1>
          {finished && doneCount > 0
            ? 'Session Complete!'
            : sessionState === 'LOOT' && currentLoot?.type === 'trap'
              ? 'It’s a trap!'
              : sessionState === 'CHEST' || sessionState === 'LOOT'
                ? 'Treasure!'
                : 'Study'}
        </h1>
        <p>
          {finished
            ? doneCount > 0
              ? `Reviewed ${doneCount} card${doneCount === 1 ? '' : 's'}.`
              : 'Nothing due right now.'
            : sessionState === 'CHEST'
              ? 'A chest appeared. Swipe up to open it.'
              : sessionState === 'LOOT' && currentLoot?.type === 'trap'
                ? 'The chest was a mimic. You take the hit.'
                : sessionState === 'LOOT'
                  ? 'Use it now or stash it in your bag.'
                : `${sessionQueue.length} remaining · ${doneCount} done`}
        </p>
        {finished ? null : (
          <div className="study-hp">
            <HeartsDisplay stats={stats} compact />
          </div>
        )}
      </header>

      <div className="study-card-stage">
        {sessionState === 'CHEST' ? (
          <ChestEncounter onOpen={openChest} />
        ) : sessionState === 'LOOT' && currentLoot ? (
          <LootReveal
            item={currentLoot}
            busy={claiming}
            onUseNow={() => void handleUseLoot()}
            onAddToInventory={() => void handleStashLoot()}
            onContinue={returnToCards}
          />
        ) : finished ? (
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
        ) : current ? (
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
        ) : null}
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
      {damageFlash ? <div className="loot-damage-flash" aria-hidden /> : null}
    </section>
  )
}
