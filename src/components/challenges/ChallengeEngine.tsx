import { useMemo, useState } from 'react'
import type { Card } from '@/db'
import { TextInputChallenge } from '@/components/challenges/TextInputChallenge'
import { ScrambleChallenge } from '@/components/challenges/ScrambleChallenge'
import {
  countChoiceDistractors,
  MultipleChoiceChallenge,
} from '@/components/challenges/MultipleChoiceChallenge'

export type ChallengeKind =
  | 'TEXT_INPUT'
  | 'SCRAMBLE'
  | 'VOICE'
  | 'MULTIPLE_CHOICE'

type ChallengeEngineProps = {
  card: Card
  deckCards: Card[]
  busy?: boolean
  onComplete: (isSuccess: boolean) => void
}

function pickChallengeKind(
  answer: string,
  canMultipleChoice: boolean,
): ChallengeKind {
  const pool: ChallengeKind[] = ['TEXT_INPUT']
  const chars = Array.from(answer.trim())
  if (chars.length >= 2 && chars.length <= 16) {
    pool.push('SCRAMBLE')
  }
  if (canMultipleChoice) {
    pool.push('MULTIPLE_CHOICE')
  }
  return pool[Math.floor(Math.random() * pool.length)] ?? 'TEXT_INPUT'
}

function challengeTitle(kind: ChallengeKind): string {
  if (kind === 'SCRAMBLE') return 'Unscramble the answer'
  if (kind === 'MULTIPLE_CHOICE') return 'Choose the matching front'
  return 'Type the answer'
}

/**
 * Post-“I know” challenge gate. VOICE is reserved; falls back to text input.
 */
export function ChallengeEngine({
  card,
  deckCards,
  busy = false,
  onComplete,
}: ChallengeEngineProps) {
  const kind = useMemo(() => {
    const canMultipleChoice = countChoiceDistractors(card, deckCards) >= 2
    const rolled = pickChallengeKind(card.back, canMultipleChoice)
    return rolled === 'VOICE' ? 'TEXT_INPUT' : rolled
  }, [card, deckCards])

  const [resolved, setResolved] = useState(false)

  function finish(isSuccess: boolean) {
    if (busy || resolved) return
    setResolved(true)
    onComplete(isSuccess)
  }

  const locked = busy || resolved
  const isMultipleChoice = kind === 'MULTIPLE_CHOICE'

  return (
    <div className="challenge-engine flex w-full flex-col gap-5">
      <div className="space-y-2 text-center">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
          Challenge
        </p>
        {isMultipleChoice ? null : (
          <>
            <p className="m-0 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              {card.front}
            </p>
            {card.romaji ? (
              <p className="m-0 text-sm italic text-muted-foreground">
                {card.romaji}
              </p>
            ) : null}
          </>
        )}
        <p className="m-0 text-sm text-muted-foreground">{challengeTitle(kind)}</p>
      </div>

      {isMultipleChoice ? (
        <MultipleChoiceChallenge
          card={card}
          deckCards={deckCards}
          disabled={locked}
          onComplete={finish}
        />
      ) : kind === 'SCRAMBLE' ? (
        <ScrambleChallenge
          expected={card.back}
          disabled={locked}
          onComplete={finish}
        />
      ) : (
        <TextInputChallenge
          expected={card.back}
          disabled={locked}
          onComplete={finish}
        />
      )}
    </div>
  )
}
