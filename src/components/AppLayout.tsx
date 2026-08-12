import { Link, Outlet } from 'react-router-dom'
import { Layers } from 'lucide-react'
import './AppLayout.css'

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          <Layers size={22} aria-hidden />
          <span>Unki</span>
        </Link>
        <nav className="app-nav" aria-label="Main">
          <Link to="/">Decks</Link>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
