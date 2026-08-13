import { Heart, Route, ScrollText, Skull, type LucideIcon } from 'lucide-react'
import type { ItemId, ItemType } from '@/lib/items'
import { cn } from '@/lib/utils'

const TYPE_ICON: Record<ItemType, LucideIcon> = {
  consumable: Heart,
  scroll: ScrollText,
  trap: Skull,
}

const ITEM_ICON: Partial<Record<ItemId, LucideIcon>> = {
  health_potion: Heart,
  knowledge_scroll: ScrollText,
  mimic_trap: Skull,
  escape_rope: Route,
}

export function ItemIcon({
  type,
  itemId,
  className,
}: {
  type: ItemType
  itemId?: string
  className?: string
}) {
  const Icon =
    (itemId ? ITEM_ICON[itemId as ItemId] : undefined) ?? TYPE_ICON[type]
  const filled = type === 'consumable' && itemId !== 'escape_rope'
  return <Icon className={cn(filled && 'fill-current', className)} aria-hidden />
}
