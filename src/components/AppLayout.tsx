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
    <div className="app-shell relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <main
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 pt-6 pb-4 text-left',
          inDungeon && 'pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
        )}
      >
        <Outlet />
      </main>
      {inDungeon ? null : <BottomNav />}
    </div>
  )
}
