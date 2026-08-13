import type { Item } from '@/lib/items'
import { Button } from '@/components/ui/button'
import { ItemIcon } from '@/components/ItemIcon'
import { cn } from '@/lib/utils'

type LootActionsProps = {
  item: Item
  busy: boolean
  onUseNow: () => void
  onAddToInventory: () => void
  onContinue: () => void
}

export function LootCardFace({ item }: { item: Item }) {
  return (
    <>
      <div
        className={cn('loot-badge', `loot-badge-${item.type}`)}
        aria-hidden
      >
        <ItemIcon type={item.type} itemId={item.id} />
      </div>
      <h2 className="loot-name">{item.name}</h2>
      <p className="loot-desc">{item.description}</p>
    </>
  )
}

export function LootActions({
  item,
  busy,
  onUseNow,
  onAddToInventory,
  onContinue,
}: LootActionsProps) {
  if (item.type === 'trap') {
    return (
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
    )
  }

  return (
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
  )
}

type LootRevealProps = LootActionsProps

export function LootReveal({
  item,
  busy,
  onUseNow,
  onAddToInventory,
  onContinue,
}: LootRevealProps) {
  return (
    <div className="loot-screen">
      <div className={cn('loot-card', `loot-card-${item.type}`)}>
        <LootCardFace item={item} />
      </div>
      <LootActions
        item={item}
        busy={busy}
        onUseNow={onUseNow}
        onAddToInventory={onAddToInventory}
        onContinue={onContinue}
      />
    </div>
  )
}
