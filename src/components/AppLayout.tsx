import { Link, Outlet } from 'react-router-dom'
import { BookOpen, Layers } from 'lucide-react'

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-[radial-gradient(1200px_500px_at_10%_-10%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_60%),var(--background)]">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/85 px-5 py-3.5 backdrop-blur-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground no-underline"
        >
          <Layers size={22} aria-hidden />
          <span>Unki</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          <Link
            to="/"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground no-underline hover:bg-accent hover:text-foreground"
          >
            Cards
          </Link>
          <Link
            to="/study"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground no-underline hover:bg-accent hover:text-foreground"
          >
            <BookOpen size={16} aria-hidden />
            Study
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 py-6 pb-12 text-left">
        <Outlet />
      </main>
    </div>
  )
}
