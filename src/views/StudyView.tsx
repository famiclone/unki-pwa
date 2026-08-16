import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { Backpack, PartyPopper, Undo2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  addInventoryItem,
  applyItemEffect,
  db,
  listInventory,
  useInventoryItem,
  type Deck,
} from '../db'
import { getStudyQueue, rateCard, type StudyItem } from '../db/study'
import type { Grade } from '../lib/srs'
import {
  CHEST_DROP_CHANCE,
  isRunBagItemId,
  pickChestLoot,
  type Item,
} from '@/lib/items'
import { generateDungeonName } from '@/lib/nameGenerator'
import {
  parseSessionBatchSize,
  parseStudyMode,
  sessionBatchLimit,
  type StudyLocationState,
  type StudyMode,
} from '@/lib/studyMode'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ChallengeEngine } from '@/components/challenges/ChallengeEngine'
import { ChestEncounter } from '@/components/ChestEncounter'
import { Flashcard } from '@/components/Flashcard'
import { HeartsDisplay } from '@/components/HeartsDisplay'
import { ItemIcon } from '@/components/ItemIcon'
import { SwipeCardShell } from '@/components/SwipeCardShell'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  awardReviewExp,
  commitRunRewards,
  recordStudyActivity,
  useStreak,
} from '@/hooks/useStreak'
import { againDamage } from '@/lib/gamification'
import './StudyView.css'

type RunRewards = { exp: number; coins: number }

type SessionState = 'CARD' | 'CHALLENGE' | 'CHEST' | 'LOOT'

type CombatFeedback = {
  id: number
  text: string
  type: 'damage' | 'shielded' | 'heal' | 'exp' | 'loot'
}

const FEEDBACK_CLASS: Record<CombatFeedback['type'], string> = {
  damage: 'text-red-500 font-bold text-2xl drop-shadow-md animate-floatUp',
  shielded:
    'text-sky-400 font-bold text-2xl drop-shadow-md animate-floatUp',
  heal: 'text-green-400 font-bold text-xl drop-shadow-md animate-floatUp',
  exp: 'text-yellow-400 font-bold text-xl drop-shadow-md animate-floatUp',
  loot: 'text-amber-400 font-bold text-xl drop-shadow-md animate-floatUp',
}

/** Scramble UI stays stable only for short answers. */
const CHALLENGE_MAX_BACK_LENGTH = 10

/** Level-scaled chance to open a challenge before banking Good. Cap 50%. */
function tryTriggerChallenge(cardBack: string, heroLevel: number): boolean {
  if (cardBack.length > CHALLENGE_MAX_BACK_LENGTH) return false
  const chance = Math.min(0.05 + heroLevel * 0.01, 0.5)
  return Math.random() < chance
}

function GradeButtons({
  onAgain,
  onChallenge,
  rating,
  canChallenge,
}: {
  onAgain: () => void
  onChallenge: () => void
  rating: boolean
  canChallenge: boolean
}) {
  return (
    <div
      className={cn('grade-row', !canChallenge && 'grade-row-single')}
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
      {canChallenge ? (
        <button
          type="button"
          className="grade-btn grade-know"
          disabled={rating}
          onClick={onChallenge}
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
  mode,
}: {
  item: StudyItem
  revealed: boolean
  onReveal: () => void
  onAgain: () => void
  onKnow: () => void
  rating: boolean
  meta: string
  deckColor?: string
  mode: StudyMode
}) {
  const classic = mode === 'classic'
  const canKnow = classic || !revealed

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
          onChallenge={onKnow}
          rating={rating}
          canChallenge={canKnow}
        />
        {classic ? null : revealed ? (
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
  const location = useLocation()
  const { stats } = useStreak()
  const { deckId: deckIdFromPath } = useParams<{ deckId?: string }>()
  const [searchParams] = useSearchParams()
  const deckIdFromQuery = searchParams.get('deckId')
  const deckId = deckIdFromPath || deckIdFromQuery || undefined
  const mode = parseStudyMode(
    searchParams.get('mode'),
    (location.state as StudyLocationState | null)?.mode,
  )
  const batchSize = parseSessionBatchSize(
    searchParams.get('batch'),
    (location.state as StudyLocationState | null)?.batchSize,
  )
  const classic = mode === 'classic'

  const deck = useLiveQuery(async () => {
    if (!deckId) return null
    return (await db.decks.get(deckId)) ?? null
  }, [deckId])
  const decks = useLiveQuery(() => db.decks.toArray(), [])
  const runBag = useLiveQuery(async () => {
    const stacks = await listInventory()
    return stacks.filter((stack) => isRunBagItemId(stack.itemId))
  }, [])
  const deckById = useMemo(() => {
    const map = new Map<string, Deck>()
    for (const item of decks ?? []) map.set(item.id, item)
    return map
  }, [decks])

  const [sessionQueue, setSessionQueue] = useState<StudyItem[]>([])
  const [sessionState, setSessionState] = useState<SessionState>('CARD')
  const [dungeonName, setDungeonName] = useState(generateDungeonName)
  const [showIntro, setShowIntro] = useState(false)
  const [currentLoot, setCurrentLoot] = useState<Item | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [rating, setRating] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [doneCount, setDoneCount] = useState(0)
  const [moreDueRemaining, setMoreDueRemaining] = useState(false)
  const [runRewards, setRunRewards] = useState<RunRewards>({ exp: 0, coins: 0 })
  const [runCleared, setRunCleared] = useState(false)
  const [fleeOpen, setFleeOpen] = useState(false)
  const [bagOpen, setBagOpen] = useState(false)
  const [bagBusy, setBagBusy] = useState(false)
  const [safelyEscaped, setSafelyEscaped] = useState(false)
  const [feedback, setFeedback] = useState<CombatFeedback[]>([])
  const [shaking, setShaking] = useState(false)
  const [damageFlash, setDamageFlash] = useState(false)
  const feedbackSeq = useRef(0)
  const timeoutsRef = useRef<number[]>([])
  const trapResolved = useRef(false)
  const runRewardsRef = useRef<RunRewards>({ exp: 0, coins: 0 })
  const runCommitted = useRef(false)

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
          limit === Number.POSITIVE_INFINITY
            ? batch
            : batch.slice(0, limit)
        setSessionQueue(sessionBatch)
        setMoreDueRemaining(batch.length > sessionBatch.length)
        setSessionState('CARD')
        setDungeonName(generateDungeonName())
        setShowIntro(sessionBatch.length > 0 && mode !== 'classic')
        setCurrentLoot(null)
        setRevealed(false)
        setDoneCount(0)
        setRunRewards({ exp: 0, coins: 0 })
        runRewardsRef.current = { exp: 0, coins: 0 }
        runCommitted.current = false
        setRunCleared(false)
        setSafelyEscaped(false)
        setBagOpen(false)
        trapResolved.current = false
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [deckId, mode, batchSize])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  useEffect(() => {
    if (!showIntro) return
    const id = window.setTimeout(() => setShowIntro(false), 1800)
    return () => window.clearTimeout(id)
  }, [showIntro])

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

  function bankRewards(exp: number, coins: number) {
    if (exp <= 0 && coins <= 0) return
    const next = {
      exp: runRewardsRef.current.exp + Math.max(0, exp),
      coins: runRewardsRef.current.coins + Math.max(0, coins),
    }
    runRewardsRef.current = next
    setRunRewards(next)
  }

  function returnToCards() {
    setCurrentLoot(null)
    setSessionState('CARD')
    trapResolved.current = false
  }

  async function completeDungeonRun() {
    if (runCommitted.current) return
    runCommitted.current = true
    try {
      const payout = runRewardsRef.current
      const result = await commitRunRewards(payout.exp, payout.coins)
      setRunCleared(true)
      if (result.leveledUp) {
        toast.success(`🎉 Level Up! You are now Level ${result.newLevel}!`)
      }
    } catch {
      runCommitted.current = false
      toast.error('Could not bank run rewards')
    }
  }

  function fleeDungeon() {
    runCommitted.current = true
    runRewardsRef.current = { exp: 0, coins: 0 }
    setRunRewards({ exp: 0, coins: 0 })
    setFleeOpen(false)
    navigate('/hero')
  }

  async function leaveClassicSession() {
    if (runCommitted.current) return
    runCommitted.current = true
    try {
      const payout = runRewardsRef.current
      if (payout.exp > 0 || payout.coins > 0) {
        const result = await commitRunRewards(payout.exp, payout.coins)
        if (result.leveledUp) {
          toast.success(`🎉 Level Up! You are now Level ${result.newLevel}!`)
        }
      }
      navigate('/hero')
    } catch {
      runCommitted.current = false
      toast.error('Could not save session progress')
    }
  }

  async function finishSafeEscape() {
    if (runCommitted.current) return
    runCommitted.current = true
    setBagOpen(false)
    try {
      const payout = runRewardsRef.current
      const result = await commitRunRewards(payout.exp, payout.coins)
      setSafelyEscaped(true)
      setRunCleared(true)
      toast.success('Safely Escaped!')
      if (result.leveledUp) {
        toast.success(`🎉 Level Up! You are now Level ${result.newLevel}!`)
      }
      navigate('/hero')
    } catch {
      runCommitted.current = false
      toast.error('Could not escape with your loot')
    }
  }

  async function handleUseBagItem(itemId: string) {
    if (bagBusy || finished) return
    setBagBusy(true)
    try {
      if (itemId === 'escape_rope') {
        await useInventoryItem(itemId)
        await finishSafeEscape()
        return
      }
      const result = await useInventoryItem(itemId)
      feedbackFromEffect(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not use item')
    } finally {
      setBagBusy(false)
    }
  }

  function feedbackFromEffect(result: {
    heartsDelta: number
    expDelta: number
    message: string
    recovered: boolean
    becameExhausted: boolean
  }) {
    if (result.heartsDelta > 0) {
      spawnFeedback(`+${result.heartsDelta} ❤️`, 'heal')
    } else if (result.heartsDelta < 0) {
      spawnFeedback(result.message || `${result.heartsDelta} ❤️`, 'damage')
    }
    if (result.expDelta > 0) {
      spawnFeedback(`+${result.expDelta} EXP`, 'exp')
      bankRewards(result.expDelta, 0)
    }
    if (result.becameExhausted) {
      toast.error('Exhausted — restore a heart with a Health Potion.')
    } else if (result.recovered) {
      toast.success('A heart returns. You’re no longer exhausted.')
    }
  }

  const current = sessionQueue[0]
  const onCard = sessionState === 'CARD'
  const finished = onCard && !current
  const dungeonVictory = finished && doneCount > 0

  useEffect(() => {
    if (!dungeonVictory) return
    void completeDungeonRun()
  }, [dungeonVictory])

  async function handleCardSuccess() {
    if (!current || rating) return

    setRating(true)
    try {
      const wasNew = !current.review || current.review.state === 'new'
      const answeringExhausted = stats.isExhausted
      await rateCard(current.card.id, 3, current.review, {
        exhausted: answeringExhausted,
      })
      const award = await awardReviewExp(3, wasNew, {
        deferRewards: true,
        skipCombat: classic,
      })

      spawnFeedback(
        answeringExhausted
          ? `+${award.expGained} EXP (No ATK bonus)`
          : `+${award.expGained} EXP`,
        'exp',
      )
      if (!classic && award.coinsGained > 0) {
        const loot = window.setTimeout(() => {
          spawnFeedback(`+${award.coinsGained} 🪙`, 'loot')
        }, 150)
        timeoutsRef.current.push(loot)
      }
      bankRewards(award.expGained, classic ? 0 : award.coinsGained)

      await recordStudyActivity()
      setDoneCount((n) => n + 1)
      setSessionQueue((prev) => prev.slice(1))
      setRevealed(false)

      if (!classic && Math.random() < CHEST_DROP_CHANCE) {
        setCurrentLoot(pickChestLoot())
        setSessionState('CHEST')
      } else {
        setCurrentLoot(null)
        setSessionState('CARD')
      }
    } finally {
      setRating(false)
    }
  }

  async function handleRateCard(grade: Grade) {
    if (grade === 3 || grade === 4) {
      await handleCardSuccess()
      return
    }
    if (!current || rating) return

    setRating(true)
    try {
      const wasNew = !current.review || current.review.state === 'new'
      const answeringExhausted = stats.isExhausted
      const againHit = classic ? 0 : againDamage(stats.defense)
      const willExhaust =
        answeringExhausted || (!classic && stats.hearts - againHit <= 0)
      await rateCard(current.card.id, grade, current.review, {
        exhausted: willExhaust,
      })
      const award = await awardReviewExp(grade, wasNew, {
        deferRewards: true,
        skipCombat: classic,
      })
      if (award.becameExhausted) {
        toast.error('Exhausted — restore a heart with a Health Potion.')
      }

      if (classic) {
        spawnFeedback('Needs review', 'exp')
      } else {
        const lost = award.heartsLost
        const label = Number.isInteger(lost)
          ? `-${lost}`
          : `-${lost.toFixed(1)}`
        if (award.damageShielded) {
          spawnFeedback(`${label} ❤️ (Shielded)`, 'shielded')
        } else {
          spawnFeedback(`${label} ❤️`, 'damage')
        }
        triggerShake()
      }

      await recordStudyActivity()
      setDoneCount((n) => n + 1)
      setSessionQueue((prev) => prev.slice(1))
      setRevealed(false)
      setCurrentLoot(null)
      setSessionState('CARD')
    } finally {
      setRating(false)
    }
  }

  function onKnow() {
    if (!current || rating) return
    if (!classic && revealed) return
    if (
      !classic &&
      tryTriggerChallenge(current.card.back, stats.level)
    ) {
      setSessionState('CHALLENGE')
      return
    }
    void handleCardSuccess()
  }

  function handleChallengeComplete(isSuccess: boolean) {
    if (isSuccess) {
      void handleCardSuccess()
      return
    }
    void handleRateCard(1)
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
      const result = await applyItemEffect(loot.id, { deferRewards: true })
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
    if (currentLoot.type === 'trap' || currentLoot.type === 'trinket') return
    setClaiming(true)
    try {
      if (currentLoot.id === 'escape_rope') {
        await finishSafeEscape()
        return
      }
      const result = await applyItemEffect(currentLoot.id, { deferRewards: true })
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
      if (currentLoot.type === 'trinket') {
        await addInventoryItem(currentLoot.id, 1, {
          name: currentLoot.name,
          description: currentLoot.description,
          value: currentLoot.value,
        })
      } else {
        await addInventoryItem(currentLoot.id)
      }
      toast.success(`${currentLoot.name} added to your bag`)
      returnToCards()
    } catch {
      toast.error('Could not stash the loot')
    } finally {
      setClaiming(false)
    }
  }

  if ((deckId && deck === undefined) || loading) {
    return <p className="empty-state">Loading study session…</p>
  }

  if (deckId && deck === null) {
    return (
      <section>
        <p className="empty-state">Deck not found.</p>
        <Link to="/hero" className="back-link">
          Return to Hero
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

  return (
    <section className="study-view relative">
      {finished || safelyEscaped ? null : (
        <div className="dungeon-dock">
          <button
            type="button"
            className="dungeon-dock-run"
            onClick={() => {
              if (classic) {
                void leaveClassicSession()
                return
              }
              setFleeOpen(true)
            }}
          >
            <Undo2 size={18} aria-hidden />
            {classic ? 'Leave' : 'Run'}
          </button>
          {classic ? null : (
            <button
              type="button"
              className="dungeon-dock-bag"
              onClick={() => setBagOpen(true)}
            >
              <Backpack size={18} aria-hidden />
              Bag
            </button>
          )}
        </div>
      )}

      <div className={cn(shaking && 'animate-shake')}>
      <header className="view-header">
        <h1>
          {safelyEscaped
            ? 'Safely Escaped!'
            : dungeonVictory
              ? classic
                ? 'Session Complete!'
                : 'Dungeon Cleared!'
            : sessionState === 'CHALLENGE'
              ? 'Prove it!'
            : sessionState === 'LOOT' && currentLoot?.type === 'trap'
              ? 'It’s a trap!'
              : sessionState === 'CHEST' || sessionState === 'LOOT'
                ? 'Treasure!'
                : classic
                  ? 'Classic Review'
                  : dungeonName}
        </h1>
        <p>
          {safelyEscaped
            ? 'You kept the run loot and left the dungeon.'
            : dungeonVictory
            ? classic
              ? `Reviewed ${doneCount} card${doneCount === 1 ? '' : 's'}.`
              : `Reviewed ${doneCount} card${doneCount === 1 ? '' : 's'} in the ${dungeonName}.`
            : finished
              ? 'Nothing due right now.'
              : sessionState === 'CHALLENGE'
                ? 'Pass the challenge without peeking at the answer.'
              : sessionState === 'CHEST'
                ? 'A chest appeared.'
                : sessionState === 'LOOT' && currentLoot?.type === 'trap'
                  ? 'The chest was a mimic. You take the hit.'
                  : sessionState === 'LOOT' && currentLoot?.type === 'trinket'
                    ? 'Stash it — sell later at the Shop.'
                    : sessionState === 'LOOT'
                      ? 'Use it now or stash it in your bag.'
                      : `${sessionQueue.length} remaining · ${doneCount} done`}
        </p>
        {finished || safelyEscaped || classic ? null : (
          <div className="study-hp">
            <HeartsDisplay stats={stats} compact showMeta={false} />
            <p className="run-bank">
              Run loot · +{runRewards.exp} EXP · +{runRewards.coins} 🪙
            </p>
          </div>
        )}
      </header>

      <div className="study-card-stage">
        {currentLoot &&
        (sessionState === 'CHEST' || sessionState === 'LOOT') ? (
          <ChestEncounter
            item={currentLoot}
            revealed={sessionState === 'LOOT'}
            busy={claiming}
            onOpen={openChest}
            onUseNow={() => void handleUseLoot()}
            onAddToInventory={() => void handleStashLoot()}
            onContinue={returnToCards}
          />
        ) : finished || safelyEscaped ? (
          <div className="study-complete">
            {safelyEscaped || dungeonVictory ? (
              <>
                <PartyPopper className="session-complete-icon" size={36} aria-hidden />
                <p className="empty-state">
                  {safelyEscaped
                    ? 'Safely Escaped! Your run loot is saved.'
                    : runCleared
                      ? 'Rewards are saved to your hero.'
                      : 'Banking run rewards…'}
                </p>
                <p className="session-exp">
                  Earned: +{runRewards.exp} EXP
                  {classic ? '' : `, +${runRewards.coins} coins`}
                </p>
                {moreDueRemaining ? (
                  <p className="m-0 text-center text-sm text-muted-foreground">
                    There are still more cards due. Take a rest at the Inn and
                    come back!
                  </p>
                ) : null}
              </>
            ) : (
              <p className="empty-state">
                Add cards or wait until reviews are due.
              </p>
            )}
            <div className="study-actions">
              {safelyEscaped || dungeonVictory ? (
                <button
                  type="button"
                  className="back-link"
                  disabled={!runCleared}
                  onClick={() => navigate('/hero')}
                >
                  Return to Hero
                </button>
              ) : (
                <Link to="/hero" className="back-link">
                  Return to Hero
                </Link>
              )}
            </div>
          </div>
        ) : current && sessionState === 'CHALLENGE' && !classic ? (
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
            onAgain={() => void handleRateCard(1)}
            onKnow={onKnow}
            rating={rating}
            meta={cardMeta}
            deckColor={currentDeckColor}
            mode={mode}
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
      </div>
      {showIntro && !finished ? (
        <div className="dungeon-intro" aria-live="polite">
          <p className="dungeon-intro-kicker">Entering the</p>
          <p className="dungeon-intro-name">{dungeonName}</p>
        </div>
      ) : null}

      <Dialog open={bagOpen} onOpenChange={setBagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inventory</DialogTitle>
            <DialogDescription>
              Only potions and escape ropes work in a run.
            </DialogDescription>
          </DialogHeader>
          {(runBag ?? []).length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">
              No usable items. Loot a Health Potion or Escape Rope first.
            </p>
          ) : (
            <ul className="m-0 grid w-full min-w-0 list-none gap-2 p-0">
              {(runBag ?? []).map((stack) => (
                <li
                  key={stack.id}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                    <ItemIcon
                      type={stack.item.type}
                      itemId={stack.item.id}
                      className="size-5 shrink-0"
                    />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="m-0 truncate text-sm font-semibold">
                        {stack.item.name}{' '}
                        <span className="text-xs font-medium text-muted-foreground">
                          ×{stack.quantity}
                        </span>
                      </p>
                      <p className="m-0 truncate text-xs text-muted-foreground">
                        {stack.item.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    disabled={bagBusy}
                    onClick={() => void handleUseBagItem(stack.itemId)}
                  >
                    Use
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {classic ? null : (
        <AlertDialog open={fleeOpen} onOpenChange={setFleeOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Flee the dungeon?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to flee? You will lose all EXP and Coins
                accumulated in this run!
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={fleeDungeon}>Flee</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  )
}
