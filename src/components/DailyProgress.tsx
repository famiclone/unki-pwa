import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus } from 'lucide-react'
import { useDailyProgress } from '@/hooks/useDailyProgress'
import { CardStatBlocks } from '@/components/StatsDashboard'
import { Button } from '@/components/ui/button'

type DailyProgressProps = {
  onAddCards: () => void
}

export function DailyProgress({ onAddCards }: DailyProgressProps) {
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
      <CardStatBlocks />
      <Button
        type="button"
        className="h-16 w-full rounded-xl text-xl shadow-lg"
        onClick={() => navigate('/study')}
      >
        <BookOpen className="size-6" />
        Study
      </Button>
    </section>
  )
}
