import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { cn } from '@/lib/utils'

function isStudyPath(pathname: string) {
  return pathname === '/study' || pathname.endsWith('/study')
}

export function AppLayout() {
  const { pathname } = useLocation()
  const inDungeon = isStudyPath(pathname)

  return (
    <div className="app-shell relative mx-auto min-h-svh w-full max-w-md overflow-x-hidden border-x border-border">
      <main
        className={cn(
          'px-5 pt-6 text-left',
          inDungeon
            ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
            : 'pb-[calc(6rem+env(safe-area-inset-bottom))]',
        )}
      >
        <Outlet />
      </main>
      {inDungeon ? null : <BottomNav />}
    </div>
  )
}
