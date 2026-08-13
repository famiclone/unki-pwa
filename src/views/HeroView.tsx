import { useState } from 'react'
import { Coins, Sword } from 'lucide-react'
import { toast } from 'sonner'
import { useHeroData, type PopulatedInventoryItem } from '@/hooks/useHeroData'
import { useInventoryItem } from '@/db/inventory'
import { calculateLevelStats, getRankTitle } from '@/lib/gamification'
import { HeartsDisplay } from '@/components/HeartsDisplay'
import { ItemIcon } from '@/components/ItemIcon'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function HeroView() {
  const { stats, populatedInventory, loading } = useHeroData()
  const level = calculateLevelStats(stats.exp)
  const rank = getRankTitle(level.currentLevel)
  const [selected, setSelected] = useState<PopulatedInventoryItem | null>(null)
  const [using, setUsing] = useState(false)

  async function handleUse() {
    if (!selected || using) return
    setUsing(true)
    try {
      const result = await useInventoryItem(selected.id)
      if (result.leveledUp) {
        toast.success(`🎉 Level Up! You are now Level ${result.stats.level}!`)
      }
      if (result.recovered) {
        toast.success('A heart returns. You’re no longer exhausted.')
      } else if (result.becameExhausted) {
        toast.error('Exhausted — restore a heart with a Health Potion.')
      } else {
        toast.message(result.item.name, { description: result.message })
      }
      setSelected(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not use item')
    } finally {
      setUsing(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Character
        </p>
        <h1 className="m-0 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Hero
        </h1>
      </header>

      <div
        className={cn(
          'relative space-y-4 overflow-hidden rounded-xl border border-border bg-card/80 p-4',
          stats.isExhausted && 'grayscale-[0.35]',
        )}
        aria-label={`${rank}, level ${level.currentLevel}`}
      >
        {stats.isExhausted ? (
          <span className="absolute top-3 right-3 rounded-full border border-border bg-muted px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
            Exhausted
          </span>
        ) : null}

        <div className="space-y-1 pr-16">
          <p className="m-0 text-sm font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            {rank}
          </p>
          <p className="m-0 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Level {level.currentLevel}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium tabular-nums text-muted-foreground">
            <span>EXP</span>
            <span>
              {level.currentLevelExp} / {level.expNeededForNextLevel}
            </span>
          </div>
          <Progress
            value={level.progressPercentage}
            className="h-2.5 bg-amber-500/15"
            indicatorClassName="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300"
            aria-label="Experience toward next level"
          />
        </div>

        <HeartsDisplay stats={stats} showMeta={false} />

        <div className="grid grid-cols-2 gap-2">
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border border-border px-3 py-2',
              stats.isExhausted && 'opacity-60',
            )}
          >
            <Sword className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
            <div>
              <p className="m-0 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Attack
              </p>
              <p className="m-0 text-lg font-bold tabular-nums">{stats.attack}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Coins className="size-4 text-amber-500" aria-hidden />
            <div>
              <p className="m-0 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Coins
              </p>
              <p className="m-0 text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {stats.coins}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-3" aria-label="Inventory">
        <h2 className="m-0 text-lg font-semibold tracking-tight">Inventory</h2>
        {loading ? (
          <p className="m-0 text-sm text-muted-foreground">Loading backpack…</p>
        ) : populatedInventory.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">
            Your backpack is empty. Open chests while studying to find loot.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-5">
            {populatedInventory.map((stack) => (
              <li key={stack.id}>
                <button
                  type="button"
                  className={cn(
                    'relative flex aspect-square w-full items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-800 text-zinc-100 shadow-inner',
                    'transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  aria-label={`${stack.item.name}, quantity ${stack.quantity}`}
                  onClick={() => setSelected(stack)}
                >
                  <ItemIcon
                    type={stack.item.type}
                    itemId={stack.item.id}
                    className={cn(
                      'size-7',
                      stack.item.id === 'escape_rope' && 'text-sky-300',
                      stack.item.type === 'consumable' &&
                        stack.item.id !== 'escape_rope' &&
                        'text-red-400',
                      stack.item.type === 'scroll' && 'text-amber-300',
                      stack.item.type === 'trap' && 'text-red-500',
                      stack.item.type === 'trinket' && 'text-violet-300',
                    )}
                  />
                  <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-zinc-950/90 text-[0.65rem] font-bold tabular-nums">
                    {stack.quantity}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open && !using) setSelected(null)
        }}
      >
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader className="items-center text-center sm:items-center">
                <div
                  className={cn(
                    'mb-1 flex size-16 items-center justify-center rounded-full border',
                    selected.item.id === 'escape_rope' &&
                      'border-sky-500/35 bg-sky-500/10 text-sky-600',
                    selected.item.type === 'consumable' &&
                      selected.item.id !== 'escape_rope' &&
                      'border-red-500/30 bg-red-500/10 text-red-500',
                    selected.item.type === 'scroll' &&
                      'border-amber-500/35 bg-amber-500/10 text-amber-600',
                    selected.item.type === 'trap' &&
                      'border-red-700/40 bg-red-700/10 text-red-700',
                    selected.item.type === 'trinket' &&
                      'border-violet-500/35 bg-violet-500/10 text-violet-500',
                  )}
                >
                  <ItemIcon
                    type={selected.item.type}
                    itemId={selected.item.id}
                    className="size-8"
                  />
                </div>
                <DialogTitle>{selected.item.name}</DialogTitle>
                <DialogDescription>{selected.item.description}</DialogDescription>
                {selected.item.type === 'trinket' ? (
                  <p className="m-0 text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                    Merchant value · {selected.item.value} 🪙
                  </p>
                ) : null}
              </DialogHeader>
              <Button
                type="button"
                className="w-full"
                variant={selected.item.type === 'trap' ? 'destructive' : 'default'}
                disabled={using || selected.item.id === 'escape_rope'}
                onClick={() => void handleUse()}
              >
                {selected.item.id === 'escape_rope'
                  ? 'Dungeon only'
                  : selected.item.type === 'trinket'
                    ? `Sell for ${selected.item.value} 🪙`
                    : 'Use Item'}
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
