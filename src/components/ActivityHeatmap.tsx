import { useMemo } from 'react'
import {
  CONTRIBUTION_TIER_CLASS,
  formatHeatmapTooltip,
  getContributionTier,
  type ContributionTier,
  type HeatmapDay,
} from '@/lib/heatmap'
import { cn } from '@/lib/utils'

type ActivityHeatmapProps = {
  heatmapData: HeatmapDay[]
}

type GridCell =
  | { kind: 'pad'; key: string }
  | { kind: 'day'; key: string; date: string; count: number; tier: ContributionTier }

function buildGridCells(days: HeatmapDay[]): GridCell[] {
  if (days.length === 0) return []

  const first = new Date(`${days[0]!.date}T12:00:00`)
  const leadingPads = first.getDay()
  const cells: GridCell[] = []

  for (let i = 0; i < leadingPads; i += 1) {
    cells.push({ kind: 'pad', key: `pad-${i}` })
  }

  for (const day of days) {
    cells.push({
      kind: 'day',
      key: day.date,
      date: day.date,
      count: day.count,
      tier: getContributionTier(day.count),
    })
  }

  return cells
}

export function ActivityHeatmap({ heatmapData }: ActivityHeatmapProps) {
  const cells = useMemo(() => buildGridCells(heatmapData), [heatmapData])

  return (
    <div
      className="w-full"
      aria-label="Study activity heatmap for the last 90 days"
    >
      <div className="grid w-full grid-flow-col grid-rows-7 gap-1 [grid-auto-columns:minmax(0,1fr)]">
        {cells.map((cell) => {
          if (cell.kind === 'pad') {
            return (
              <div
                key={cell.key}
                className="aspect-square w-full min-w-0 rounded-sm"
                aria-hidden
              />
            )
          }

          return (
            <div
              key={cell.key}
              className={cn(
                'aspect-square w-full min-w-0 rounded-sm',
                CONTRIBUTION_TIER_CLASS[cell.tier],
              )}
              title={formatHeatmapTooltip(cell.date, cell.count)}
            />
          )
        })}
      </div>
    </div>
  )
}
