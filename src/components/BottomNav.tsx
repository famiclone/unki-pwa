import { NavLink, useLocation } from 'react-router-dom'
import { BarChart2, BookOpen, Library, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  {
    to: '/decks',
    label: 'Decks',
    icon: Library,
    isActive: (pathname: string) =>
      pathname === '/decks' || /^\/decks\/[^/]+$/.test(pathname),
  },
  {
    to: '/cards',
    label: 'Study',
    icon: BookOpen,
    isActive: (pathname: string) =>
      pathname === '/cards' || pathname === '/',
  },
  {
    to: '/stats',
    label: 'Stats',
    icon: BarChart2,
    isActive: (pathname: string) => pathname.startsWith('/stats'),
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

  return (
    <nav
      className="z-50 w-full shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
      aria-label="Main"
    >
      <div className="grid h-16 grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.isActive(pathname)
          return (
            <NavLink
              key={item.to}
              to={item.to}
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
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
