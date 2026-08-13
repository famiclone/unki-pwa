import { StatsDashboard } from '@/components/StatsDashboard'

export function DashboardView() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="m-0 text-3xl tracking-tight">Dashboard</h1>
        <p className="m-0 text-sm text-muted-foreground">
          Your weekly progress and streak at a glance.
        </p>
      </header>

      <StatsDashboard />
    </section>
  )
}
