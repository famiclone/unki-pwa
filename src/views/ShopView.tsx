import { useMemo, useState } from 'react'
import { BedDouble, Coins } from 'lucide-react'
import { toast } from 'sonner'
import {
  buyItem,
  getSellPrice,
  INN_REST_PRICE,
  restAtInn,
  sellInventoryItem,
} from '@/db/inventory'
import { useHeroData } from '@/hooks/useHeroData'
import { SHOP_ITEMS, type Item } from '@/lib/items'
import { HeartsDisplay } from '@/components/HeartsDisplay'
import { ItemIcon } from '@/components/ItemIcon'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export function ShopView() {
  const { stats, populatedInventory, loading } = useHeroData()
  const [busyId, setBusyId] = useState<string | null>(null)

  const needsRest = stats.hearts < stats.maxHearts || stats.isExhausted
  const canAffordInn = stats.coins >= INN_REST_PRICE

  const sellable = useMemo(() => {
    return [...populatedInventory].sort((a, b) => {
      const rank = (type: string) => (type === 'trinket' ? 0 : 1)
      const byType = rank(a.item.type) - rank(b.item.type)
      if (byType !== 0) return byType
      return a.item.name.localeCompare(b.item.name)
    })
  }, [populatedInventory])

  async function handleBuy(item: Item) {
    if (busyId) return
    if (stats.coins < item.value) {
      toast.error('Not enough coins!')
      return
    }
    setBusyId(`buy:${item.id}`)
    try {
      const result = await buyItem(item.id)
      toast.success(`🪙 Bought ${result.item.name}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Not enough coins!',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleSell(stackId: string, name: string) {
    if (busyId) return
    setBusyId(`sell:${stackId}`)
    try {
      const result = await sellInventoryItem(stackId)
      toast.success(`Sold ${name} for ${result.coinsGained} 🪙`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sell item')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRest() {
    if (busyId) return
    if (!needsRest) {
      toast.message('You are already fully rested!')
      return
    }
    if (!canAffordInn) {
      toast.error('Not enough coins for a room!')
      return
    }
    setBusyId('inn:rest')
    try {
      await restAtInn()
      toast.success('A good night’s sleep restored your strength! ❤️')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Not enough coins for a room!',
      )
    } finally {
      setBusyId(null)
    }
  }

  const owned = new Map(
    populatedInventory.map((stack) => [stack.itemId, stack.quantity]),
  )

  return (
    <section className="space-y-5">
      <header className="space-y-3">
        <div className="space-y-1">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800/80 dark:text-amber-300/80">
            Merchant
          </p>
          <h1 className="m-0 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Shop
          </h1>
          <p className="m-0 text-base text-foreground/90">
            What are you buying, traveler?
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-700/25 bg-amber-50/80 px-3 py-2 text-amber-900 shadow-sm dark:border-amber-400/25 dark:bg-amber-950/40 dark:text-amber-200">
          <Coins className="size-5" aria-hidden />
          <div>
            <p className="m-0 text-[0.65rem] font-semibold uppercase tracking-widest opacity-70">
              Coins
            </p>
            <p className="m-0 text-xl font-bold tabular-nums leading-none">
              {loading ? '…' : stats.coins}
            </p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="buy">
        <TabsList aria-label="Shop">
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
          <TabsTrigger value="inn">Inn</TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-2">
          {SHOP_ITEMS.map((item) => {
            const quantity = owned.get(item.id) ?? 0
            return (
              <article
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-amber-800/15 bg-card/80 px-3 py-3 shadow-sm dark:border-amber-200/10"
              >
                <div
                  className={cn(
                    'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-lg border',
                    item.id === 'escape_rope' &&
                      'border-sky-500/35 bg-sky-500/10 text-sky-600',
                    item.type === 'consumable' &&
                      item.id !== 'escape_rope' &&
                      'border-red-500/30 bg-red-500/10 text-red-500',
                    item.type === 'scroll' &&
                      'border-amber-500/35 bg-amber-500/10 text-amber-600',
                  )}
                >
                  <ItemIcon type={item.type} itemId={item.id} className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold">
                    {item.name}
                    {quantity > 0 ? (
                      <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                        ×{quantity}
                      </span>
                    ) : null}
                  </p>
                  <p className="m-0 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  disabled={busyId !== null}
                  onClick={() => void handleBuy(item)}
                >
                  {item.value} 🪙
                </Button>
              </article>
            )
          })}
        </TabsContent>

        <TabsContent value="sell" className="space-y-2">
          {loading ? (
            <p className="m-0 py-6 text-center text-sm text-muted-foreground">
              Checking your bags…
            </p>
          ) : sellable.length === 0 ? (
            <p className="m-0 rounded-xl border border-dashed border-amber-800/25 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing to sell. Bring me trinkets from the dungeon.
            </p>
          ) : (
            sellable.map((stack) => {
              const price = getSellPrice(stack)
              return (
                <article
                  key={stack.id}
                  className="flex items-start gap-3 rounded-xl border border-amber-800/15 bg-card/80 px-3 py-3 shadow-sm dark:border-amber-200/10"
                >
                  <div
                    className={cn(
                      'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-lg border',
                      stack.item.type === 'trinket' &&
                        'border-violet-500/35 bg-violet-500/10 text-violet-500',
                      stack.item.id === 'escape_rope' &&
                        'border-sky-500/35 bg-sky-500/10 text-sky-600',
                      stack.item.type === 'consumable' &&
                        stack.item.id !== 'escape_rope' &&
                        'border-red-500/30 bg-red-500/10 text-red-500',
                      stack.item.type === 'scroll' &&
                        'border-amber-500/35 bg-amber-500/10 text-amber-600',
                      stack.item.type === 'trap' &&
                        'border-red-700/40 bg-red-700/10 text-red-700',
                    )}
                  >
                    <ItemIcon
                      type={stack.item.type}
                      itemId={stack.item.id}
                      className="size-5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-semibold">
                      {stack.item.name}
                      {stack.quantity > 1 ? (
                        <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                          ×{stack.quantity}
                        </span>
                      ) : null}
                    </p>
                    <p className="m-0 text-xs text-muted-foreground">
                      {stack.item.type === 'trinket'
                        ? stack.item.description
                        : `Merchant offer · 50% of shop price`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    disabled={busyId !== null}
                    onClick={() => void handleSell(stack.id, stack.item.name)}
                  >
                    Sell {price} 🪙
                  </Button>
                </article>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="inn">
          <article className="space-y-4 rounded-xl border border-amber-700/20 bg-gradient-to-b from-amber-100/70 to-card/90 p-4 shadow-sm dark:border-amber-400/15 dark:from-amber-950/50 dark:to-card/80">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-amber-600/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <BedDouble className="size-6" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="m-0 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                  Rest at the Tavern
                </h2>
                <p className="m-0 text-sm text-muted-foreground">
                  Rent a quiet room for the night. Your hearts refill and Exhausted
                  clears.
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 bg-background/50 px-3 py-3">
              <p className="m-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Your condition
              </p>
              <HeartsDisplay stats={stats} showMeta={false} />
              <p className="m-0 text-sm text-foreground/90">
                {loading
                  ? 'Checking your rest…'
                  : needsRest
                    ? stats.isExhausted
                      ? 'You’re Exhausted. A night’s rest will bring you back.'
                      : `Missing ${Math.max(0, stats.maxHearts - stats.hearts)} heart${
                          stats.maxHearts - stats.hearts === 1 ? '' : 's'
                        }.`
                    : 'You are already fully rested!'}
              </p>
              <p className="m-0 text-sm font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                Room · {INN_REST_PRICE} 🪙
              </p>
            </div>

            <Button
              type="button"
              className="h-12 w-full"
              disabled={busyId !== null || loading}
              onClick={() => void handleRest()}
            >
              Rent a Room (Restore All Hearts)
            </Button>
          </article>
        </TabsContent>
      </Tabs>
    </section>
  )
}
