import { useState } from 'react'
import { Coins } from 'lucide-react'
import { toast } from 'sonner'
import { useInventory } from '@/hooks/useInventory'
import { useStreak } from '@/hooks/useStreak'
import { SHOP_ITEMS, type ItemId } from '@/lib/items'
import { Button } from '@/components/ui/button'

export function InventoryPanel() {
  const { stats } = useStreak()
  const { stacks, buyItem, useInventoryItem } = useInventory()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleBuy(itemId: ItemId) {
    setBusyId(`buy:${itemId}`)
    try {
      const result = await buyItem(itemId)
      toast.success(`Bought ${result.item.name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not buy item')
    } finally {
      setBusyId(null)
    }
  }

  async function handleUse(itemId: ItemId) {
    setBusyId(`use:${itemId}`)
    try {
      const result = await useInventoryItem(itemId)
      if (result.recovered) {
        toast.success('A heart returns. You’re no longer exhausted.')
      } else if (result.becameExhausted) {
        toast.error('Exhausted — attack bonus is off until you use a Health Potion.')
      } else {
        toast.message(result.item.name, { description: result.message })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not use item')
    } finally {
      setBusyId(null)
    }
  }

  const owned = new Map(stacks.map((stack) => [stack.itemId, stack.quantity]))

  return (
    <section
      className="space-y-3 rounded-xl border border-border bg-card/80 p-3"
      aria-label="Inventory and shop"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-semibold tracking-wide">Bag</h2>
        <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
          <Coins className="size-4" aria-hidden />
          {stats.coins}
        </span>
      </div>

      <ul className="m-0 grid list-none gap-2 p-0">
        {SHOP_ITEMS.map((item) => {
          const quantity = owned.get(item.id) ?? 0
          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border/80 px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="m-0 text-sm font-semibold">
                  {item.name}
                  {quantity > 0 ? (
                    <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                      ×{quantity}
                    </span>
                  ) : null}
                </p>
                <p className="m-0 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyId !== null || stats.coins < item.value}
                  onClick={() => void handleBuy(item.id)}
                >
                  {item.value}c
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={item.type === 'trap' ? 'destructive' : 'default'}
                  disabled={busyId !== null || quantity < 1}
                  onClick={() => void handleUse(item.id)}
                >
                  Use
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
