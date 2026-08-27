import { useEffect, useMemo, useRef, useState } from 'react'
import type { Card } from '@/db'
import { shuffled } from '@/lib/shuffle'
import { speakIfShort } from '@/lib/speech'
import { cn } from '@/lib/utils'

export type MatchChallengeProps = {
  /** Remaining session cards (not yet reviewed). Needs ≥ 4. */
  remainingCards: Card[]
  disabled?: boolean
  onComplete: () => void
}

type Tile = {
  id: string
  pairId: string
  kind: 'prompt' | 'answer'
  primary: string
  secondary?: string
}

const WRONG_FLASH_MS = 420
const SELECTED = 'border-[#4cc2ff] text-[#4cc2ff]'
const WRONG = 'border-red-500 text-red-500'

function buildTiles(cards: Card[]): { left: Tile[]; right: Tile[] } {
  const picked = shuffled(cards).slice(0, 4)
  const promptsOnLeft = Math.random() < 0.5

  const prompts: Tile[] = picked.map((card) => ({
    id: `${card.id}-prompt`,
    pairId: card.id,
    kind: 'prompt',
    primary: promptsOnLeft ? card.back : card.front,
    secondary: promptsOnLeft
      ? undefined
      : card.romaji?.trim() || undefined,
  }))

  const answers: Tile[] = picked.map((card) => ({
    id: `${card.id}-answer`,
    pairId: card.id,
    kind: 'answer',
    primary: promptsOnLeft ? card.front : card.back,
    secondary: promptsOnLeft
      ? card.romaji?.trim() || undefined
      : undefined,
  }))

  return {
    left: shuffled(prompts),
    right: shuffled(answers),
  }
}

/**
 * Pair-matching interrupt: 4 session cards → 8 tiles (prompt / answer columns).
 */
export function MatchChallenge({
  remainingCards,
  disabled = false,
  onComplete,
}: MatchChallengeProps) {
  const columns = useMemo(
    () => buildTiles(remainingCards),
    [remainingCards],
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(() => new Set())
  const [wrongIds, setWrongIds] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const flashRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (flashRef.current !== null) window.clearTimeout(flashRef.current)
    }
  }, [])

  const selected = useMemo(() => {
    if (!selectedId) return null
    return (
      columns.left.find((t) => t.id === selectedId) ??
      columns.right.find((t) => t.id === selectedId) ??
      null
    )
  }, [columns, selectedId])

  function clearFlash() {
    if (flashRef.current !== null) {
      window.clearTimeout(flashRef.current)
      flashRef.current = null
    }
  }

  function speakTerm(tile: Tile) {
    // Prefer the script/reading side when romaji is present (secondary above primary).
    speakIfShort(tile.primary)
  }

  function handleTileClick(tile: Tile) {
    if (disabled || busy) return
    if (matched.has(tile.pairId)) return

    speakTerm(tile)

    // Toggle off if tapping the already-selected tile.
    if (selectedId === tile.id) {
      setSelectedId(null)
      return
    }

    // First pick of a pair.
    if (!selected || selected.kind === tile.kind) {
      setSelectedId(tile.id)
      setWrongIds(new Set())
      return
    }

    // Second pick — check pair.
    if (selected.pairId === tile.pairId) {
      const next = new Set(matched)
      next.add(tile.pairId)
      setMatched(next)
      setSelectedId(null)
      setWrongIds(new Set())
      if (next.size >= 4) {
        setBusy(true)
        window.setTimeout(() => onComplete(), 350)
      }
      return
    }

    // Wrong pair — flash both, keep first selected.
    setBusy(true)
    setWrongIds(new Set([selected.id, tile.id]))
    clearFlash()
    flashRef.current = window.setTimeout(() => {
      setWrongIds(new Set())
      setBusy(false)
      flashRef.current = null
    }, WRONG_FLASH_MS)
  }

  function renderTile(tile: Tile) {
    const isMatched = matched.has(tile.pairId)
    const isSelected = selectedId === tile.id
    const isWrong = wrongIds.has(tile.id)

    return (
      <button
        key={tile.id}
        type="button"
        disabled={disabled || busy || isMatched}
        onClick={() => handleTileClick(tile)}
        className={cn(
          'flex w-full items-center justify-center rounded-xl border border-border bg-transparent px-3 py-3 text-center transition-colors',
          'disabled:cursor-default',
          isMatched && 'pointer-events-none opacity-35',
          isSelected && !isWrong && SELECTED,
          isWrong && WRONG,
        )}
      >
        <span className="min-w-0">
          {tile.secondary ? (
            <span className="block text-[11px] leading-tight text-muted-foreground">
              {tile.secondary}
            </span>
          ) : null}
          <span className="block text-base font-medium leading-snug break-words">
            {tile.primary}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-2 text-center">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
          Challenge
        </p>
        <p className="m-0 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Match the pairs
        </p>
        <p className="m-0 text-sm text-muted-foreground">
          Tap a term, then its match. Tap again to deselect.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="flex flex-col gap-2">
          {columns.left.map(renderTile)}
        </div>
        <div className="flex flex-col gap-2">
          {columns.right.map(renderTile)}
        </div>
      </div>
    </div>
  )
}
