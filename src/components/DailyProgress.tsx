import { useState } from 'react'
import { Plus, Sword } from 'lucide-react'
import { useDailyProgress } from '@/hooks/useDailyProgress'
import { useDeckStats } from '@/hooks/useDeckStats'
import { CardStatBlocks } from '@/components/StatsDashboard'
import { RunPrepModal } from '@/components/RunPrepModal'
import { Button } from '@/components/ui/button'

type DailyProgressProps = {
  onAddCards: () => void
  /** When set, Study opens that deck; otherwise the full queue. */
  deckId?: string | null
  deckName?: string | null
}

export function DailyProgress({
  onAddCards,
  deckId,
  deckName,
}: DailyProgressProps) {
  const { cardsToStudy, loading } = useDailyProgress()
  const deckStats = useDeckStats()
  const [prepOpen, setPrepOpen] = useState(false)

  const dueCount = deckId
    ? (deckStats[deckId]?.dueToday ?? 0)
    : cardsToStudy

  if (loading) {
    return (
      <section
        aria-label="Daily progress"
        className="rounded-xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-4 py-5 backdrop-blur-[2px]"
      >
        <p className="m-0 text-sm text-muted-foreground">
          Checking today’s queue…
        </p>
      </section>
    )
  }

  if (cardsToStudy === 0) {
    return (
      <section
        aria-label="Daily progress"
        className="space-y-4 rounded-xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-4 py-5 backdrop-blur-[2px]"
      >
        <p className="m-0 text-base leading-relaxed text-foreground">
          🎉 Awesome job! You&apos;ve finished all cards for today. Come back
          tomorrow or add new ones!
        </p>
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-full rounded-xl text-base shadow-sm"
          onClick={onAddCards}
        >
          <Plus />
          Add New Cards
        </Button>
      </section>
    )
  }

  return (
    <section aria-label="Daily progress" className="space-y-4">
      <CardStatBlocks />
      <Button
        type="button"
        className="h-16 w-full rounded-xl text-xl shadow-lg"
        onClick={() => setPrepOpen(true)}
      >
        <Sword className="size-6" />
        Go
      </Button>
      <RunPrepModal
        open={prepOpen}
        onOpenChange={setPrepOpen}
        deckId={deckId}
        deckName={deckName ?? (deckId ? 'Deck' : 'All cards')}
        dueCount={dueCount}
      />
    </section>
  )
}
