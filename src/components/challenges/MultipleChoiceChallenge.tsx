import { useMemo } from 'react'
import type { Card } from '@/db'
import { Button } from '@/components/ui/button'
import { shuffled } from '@/lib/shuffle'

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
  const options = useMemo(() => {
    const distractors = shuffled(
      deckCards.filter((candidate) => candidate.id !== card.id),
    )
      .slice(0, 2)
      .map((candidate) => candidate.front)

    return shuffled([card.front, ...distractors])
  }, [card.front, card.id, deckCards])

  function choose(option: string) {
    if (disabled) return
    onComplete(option === card.front)
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <p className="m-0 text-center font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        {card.back}
      </p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((option, index) => (
          <Button
            key={`${option}-${index}`}
            type="button"
            variant="secondary"
            disabled={disabled}
            className="h-auto min-h-14 w-full whitespace-normal px-4 py-3 text-base"
            onClick={() => choose(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  )
}
