import { Heart, ScrollText, Skull } from 'lucide-react'
import type { Item, ItemType } from '@/lib/items'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TYPE_ICON: Record<ItemType, typeof Heart> = {
  consumable: Heart,
  scroll: ScrollText,
  trap: Skull,
}

type LootRevealProps = {
  item: Item
  busy: boolean
  onUseNow: () => void
  onAddToInventory: () => void
  onContinue: () => void
}

export function LootReveal({
  item,
  busy,
  onUseNow,
  onAddToInventory,
  onContinue,
}: LootRevealProps) {
  const Icon = TYPE_ICON[item.type]
  const isTrap = item.type === 'trap'

  return (
    <div className="loot-screen">
      <div className="loot-copy">
        <div
          className={cn('loot-badge', `loot-badge-${item.type}`)}
          aria-hidden
        >
          <Icon className={item.type === 'consumable' ? 'fill-current' : undefined} />
        </div>
        <h2 className="loot-name">{item.name}</h2>
        <p className="loot-desc">{item.description}</p>
      </div>

      {isTrap ? (
        <div className="loot-actions">
          <Button
            type="button"
            className="loot-btn"
            disabled={busy}
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="loot-actions">
          <Button
            type="button"
            className="loot-btn"
            disabled={busy}
            onClick={onUseNow}
          >
            Use Now
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="loot-btn"
            disabled={busy}
            onClick={onAddToInventory}
          >
            Add to Inventory
          </Button>
        </div>
      )}
    </div>
  )
}
