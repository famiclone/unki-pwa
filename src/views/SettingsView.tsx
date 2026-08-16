import { useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { StreakBadge } from '@/components/StreakBadge'
import {
  getStoredSessionBatchSize,
  persistSessionBatchSize,
  SESSION_BATCH_OPTIONS,
  sessionBatchLabel,
  type SessionBatchSize,
} from '@/lib/studyMode'
import { cn } from '@/lib/utils'

export function SettingsView() {
  const [batchSize, setBatchSize] = useState<SessionBatchSize>(() =>
    getStoredSessionBatchSize(),
  )

  function chooseBatchSize(size: SessionBatchSize) {
    setBatchSize(size)
    persistSessionBatchSize(size)
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="m-0 text-3xl tracking-tight">Settings</h1>
        <p className="m-0 text-sm text-muted-foreground">
          Appearance and study preferences.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="m-0 text-sm font-semibold">Theme</p>
            <p className="m-0 text-xs text-muted-foreground">
              Switch between light and dark.
            </p>
          </div>
          <ThemeToggle />
        </li>
        <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="m-0 text-sm font-semibold">Study streak</p>
            <p className="m-0 text-xs text-muted-foreground">
              Consecutive days you reviewed cards.
            </p>
          </div>
          <StreakBadge />
        </li>
        <li className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="space-y-3">
            <div>
              <p className="m-0 text-sm font-semibold">Dungeon Depth</p>
              <p className="m-0 text-xs text-muted-foreground">
                How many cards to review each session (10 / 20 / 40 / All).
              </p>
            </div>
            <div
              className="grid grid-cols-4 gap-2"
              role="radiogroup"
              aria-label="Dungeon depth"
            >
              {SESSION_BATCH_OPTIONS.map((size) => {
                const selected = batchSize === size
                return (
                  <button
                    key={String(size)}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => chooseBatchSize(size)}
                    className={cn(
                      'h-10 rounded-lg border text-sm font-semibold transition-colors',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted/40',
                    )}
                  >
                    {sessionBatchLabel(size)}
                  </button>
                )
              })}
            </div>
          </div>
        </li>
      </ul>
    </section>
  )
}
