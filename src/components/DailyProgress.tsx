import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus, SquarePlus } from 'lucide-react'
import { useDailyProgress } from '@/hooks/useDailyProgress'
import { CardStatBlocks } from '@/components/StatsDashboard'
import { Button } from '@/components/ui/button'
import { buildStudyHref } from '@/lib/studyMode'
import { persistDeckFilter } from '@/lib/deckFilter'

type DailyProgressProps = {
  onAddCards: () => void
  /** When set, Study opens that deck; otherwise the full queue. */
  deckId?: string | null
  deckName?: string | null
  /** When false, Learned/Learning/New stats render in the parent instead. */
  showStats?: boolean
}

export function DailyProgress({
  onAddCards,
  deckId,
  showStats = true,
}: DailyProgressProps) {
  const navigate = useNavigate()
  const { cardsToStudy, loading } = useDailyProgress()

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
      {showStats ? <CardStatBlocks /> : null}
      <div className="flex gap-2">
        <Button
          type="button"
          className="h-16 min-w-0 flex-1 rounded-xl text-xl shadow-lg"
          onClick={() => {
            if (deckId) persistDeckFilter(deckId)
            navigate(buildStudyHref({ deckId }))
          }}
        >
          <BookOpen />
          Study
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-16 w-16 shrink-0 rounded-xl shadow-sm [&_svg]:text-muted-foreground"
          aria-label="Add card"
          onClick={onAddCards}
        >
          <SquarePlus strokeWidth={1.75} />
        </Button>
      </div>
    </section>
  )
}
