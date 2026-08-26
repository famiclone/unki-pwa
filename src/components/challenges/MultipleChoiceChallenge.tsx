import { useEffect, useMemo, useRef, useState } from 'react'
import type { Card } from '@/db'
import { Button } from '@/components/ui/button'
import { shuffled } from '@/lib/shuffle'
import { cn } from '@/lib/utils'

type MultipleChoiceChallengeProps = {
  card: Card
  deckCards: Card[]
  disabled?: boolean
  onComplete: (isSuccess: boolean) => void
}

export function countChoiceDistractors(card: Card, deckCards: Card[]): number {
  return deckCards.filter((candidate) => candidate.id !== card.id).length
}

export function MultipleChoiceChallenge({
  card,
  deckCards,
  disabled = false,
  onComplete,
}: MultipleChoiceChallengeProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const revealTimeoutRef = useRef<number | null>(null)

  const options = useMemo(() => {
    const distractors = shuffled(
      deckCards.filter((candidate) => candidate.id !== card.id),
    )
      .slice(0, 2)
      .map((candidate) => candidate.front)

    return shuffled([card.front, ...distractors])
  }, [card.front, card.id, deckCards])

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current)
      }
    }
  }, [])

  function choose(option: string) {
    if (disabled || isChecking) return
    setSelectedOption(option)
    setIsChecking(true)
    revealTimeoutRef.current = window.setTimeout(() => {
      onComplete(option === card.front)
    }, 600)
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <p className="m-0 text-center font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        {card.back}
      </p>
      <div
        className={cn(
          'grid grid-cols-1 gap-2',
          isChecking && 'pointer-events-none',
        )}
      >
        {options.map((option, index) => {
          const isCorrect = option === card.front
          const isWrongPick =
            isChecking && selectedOption === option && !isCorrect
          const isOther =
            isChecking && !isCorrect && selectedOption !== option

          return (
            <Button
              key={`${option}-${index}`}
              type="button"
              variant="secondary"
              disabled={disabled || isChecking}
              className={cn(
                'h-auto min-h-14 w-full whitespace-normal px-4 py-3 text-base',
                isChecking &&
                  isCorrect &&
                  'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-500 disabled:opacity-100',
                isWrongPick &&
                  'border-red-500 bg-red-500 text-white hover:bg-red-500 disabled:opacity-100',
                isOther && 'opacity-40',
              )}
              onClick={() => choose(option)}
            >
              {option}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
