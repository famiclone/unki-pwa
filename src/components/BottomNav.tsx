import { NavLink, useLocation } from 'react-router-dom'
import {
  Backpack,
  BookOpen,
  Library,
  Settings,
  SquareStack,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sideItems = [
  {
    to: '/decks',
    label: 'Decks',
    icon: Library,
    isActive: (pathname: string) =>
      pathname === '/decks' || /^\/decks\/[^/]+$/.test(pathname),
  },
  {
    to: '/cards',
    label: 'Cards',
    icon: SquareStack,
    isActive: (pathname: string) => pathname.startsWith('/cards'),
  },
  {
    to: '/hero',
    label: 'Hero',
    icon: Backpack,
    isActive: (pathname: string) =>
      pathname.startsWith('/hero') || pathname.startsWith('/dashboard'),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    isActive: (pathname: string) => pathname.startsWith('/settings'),
  },
] as const

export function BottomNav() {
  const { pathname } = useLocation()
  const leftItems = sideItems.slice(0, 2)
  const rightItems = sideItems.slice(2)

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-x border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
      aria-label="Main"
    >
      <div className="grid h-16 grid-cols-5">
        {leftItems.map((item) => (
          <SideNavItem
            key={item.to}
            {...item}
            active={item.isActive(pathname)}
          />
        ))}

        <div className="relative flex items-center justify-center">
          <NavLink
            to="/study"
            aria-label="Study"
            className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-[70%] items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-xl no-underline"
          >
            <BookOpen className="size-6" aria-hidden />
          </NavLink>
        </div>

        {rightItems.map((item) => (
          <SideNavItem
            key={item.to}
            {...item}
            active={item.isActive(pathname)}
          />
        ))}
      </div>
    </nav>
  )
}

function SideNavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string
  label: string
  icon: typeof Library
  active: boolean
}) {
  return (
    <NavLink
      to={to}
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-1 no-underline transition-opacity',
        active
          ? 'text-primary opacity-100'
          : 'text-muted-foreground opacity-70 hover:opacity-100',
      )}
    >
      <span className="flex size-6 items-center justify-center">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="w-full truncate px-0.5 text-center text-[11px] font-semibold leading-none">
        {label}
      </span>
    </NavLink>
  )
}
