import { ThemeToggle } from '@/components/ThemeToggle'
import { StreakBadge } from '@/components/StreakBadge'

export function SettingsView() {
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
      </ul>
    </section>
  )
}
