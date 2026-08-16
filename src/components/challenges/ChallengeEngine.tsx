import { useMemo, useState } from 'react'
import type { Card } from '@/db'
import { TextInputChallenge } from '@/components/challenges/TextInputChallenge'
import { ScrambleChallenge } from '@/components/challenges/ScrambleChallenge'

export type ChallengeKind = 'TEXT_INPUT' | 'SCRAMBLE' | 'VOICE'

type ChallengeEngineProps = {
  card: Card
  busy?: boolean
  onComplete: (isSuccess: boolean) => void
}

function pickChallengeKind(answer: string): ChallengeKind {
  const chars = Array.from(answer.trim())
  if (chars.length >= 2 && chars.length <= 16) {
    return Math.random() < 0.5 ? 'SCRAMBLE' : 'TEXT_INPUT'
  }
  return 'TEXT_INPUT'
}

/**
 * Post-“I know” challenge gate. VOICE is reserved; falls back to text input.
 */
export function ChallengeEngine({
  card,
  busy = false,
  onComplete,
}: ChallengeEngineProps) {
  const kind = useMemo(() => {
    const rolled = pickChallengeKind(card.back)
    return rolled === 'VOICE' ? 'TEXT_INPUT' : rolled
  }, [card.id, card.back])

  const [resolved, setResolved] = useState(false)

  function finish(isSuccess: boolean) {
    if (busy || resolved) return
    setResolved(true)
    onComplete(isSuccess)
  }

  const title =
    kind === 'SCRAMBLE' ? 'Unscramble the answer' : 'Type the answer'

  return (
    <div className="challenge-engine flex w-full flex-col gap-5">
      <div className="space-y-2 text-center">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
          Challenge
        </p>
        <p className="m-0 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {card.front}
        </p>
        {card.romaji ? (
          <p className="m-0 text-sm italic text-muted-foreground">{card.romaji}</p>
        ) : null}
        <p className="m-0 text-sm text-muted-foreground">{title}</p>
      </div>

      {kind === 'SCRAMBLE' ? (
        <ScrambleChallenge
          expected={card.back}
          disabled={busy || resolved}
          onComplete={finish}
        />
      ) : (
        <TextInputChallenge
          expected={card.back}
          disabled={busy || resolved}
          onComplete={finish}
        />
      )}
    </div>
  )
}
