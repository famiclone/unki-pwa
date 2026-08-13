import { Link, Outlet } from 'react-router-dom'
import { LayoutDashboard, Layers, Library } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { StreakBadge } from '@/components/StreakBadge'

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-transparent">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-[color-mix(in_oklab,var(--bg-color)_88%,transparent)] px-5 py-3.5 backdrop-blur-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground no-underline"
        >
          <Layers size={22} aria-hidden />
          <span>Unki</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          <StreakBadge />
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground no-underline hover:bg-accent hover:text-foreground"
          >
            <LayoutDashboard size={16} aria-hidden />
            Dashboard
          </Link>
          <Link
            to="/decks"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground no-underline hover:bg-accent hover:text-foreground"
          >
            <Library size={16} aria-hidden />
            Decks
          </Link>
          <Link
            to="/"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground no-underline hover:bg-accent hover:text-foreground"
          >
            Cards
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 py-6 pb-12 text-left">
        <Outlet />
      </main>
    </div>
  )
}
