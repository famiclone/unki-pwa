import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'

export function AppLayout() {
  return (
    <div className="relative mx-auto min-h-svh w-full max-w-md border-x border-border">
      <main className="px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] text-left">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
