import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { buildStudyHref, type StudyMode } from '@/lib/studyMode'
import { cn } from '@/lib/utils'

type RunPrepModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckName: string
  dueCount: number
  deckId?: string | null
}

const MODES: Array<{
  id: StudyMode
  title: string
  description: string
  Icon: typeof BookOpen
}> = [
  {
    id: 'classic',
    title: 'Classic Review',
    description:
      'Relaxed study. Flip cards to self-grade. No HP loss, no loot, no strict locks.',
    Icon: BookOpen,
  },
  {
    id: 'hardcore',
    title: 'Dungeon Run',
    description:
      'Strict active recall. Mistakes cost HP. Chests and loot enabled. Peeking locks your answer!',
    Icon: Swords,
  },
]

export function RunPrepModal({
  open,
  onOpenChange,
  deckName,
  dueCount,
  deckId,
}: RunPrepModalProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<StudyMode>('hardcore')

  useEffect(() => {
    if (open) setMode('hardcore')
  }, [open])

  function startSession() {
    const href = buildStudyHref({ mode, deckId })
    onOpenChange(false)
    navigate(href, { state: { mode } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>Prepare run</DialogTitle>
          <DialogDescription>
            {deckName}
            {' · '}
            {dueCount === 1 ? '1 card due' : `${dueCount} cards due`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3" role="radiogroup" aria-label="Study mode">
          {MODES.map(({ id, title, description, Icon }) => {
            const selected = mode === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(id)}
                className={cn(
                  'flex w-full gap-3 rounded-xl border p-4 text-left transition-colors',
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <Button
          type="button"
          className="h-12 w-full"
          disabled={dueCount <= 0}
          onClick={startSession}
        >
          Start Session
        </Button>
      </DialogContent>
    </Dialog>
  )
}
