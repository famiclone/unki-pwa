import { Heart, ScrollText, Skull, type LucideIcon } from 'lucide-react'
import type { ItemType } from '@/lib/items'
import { cn } from '@/lib/utils'

const TYPE_ICON: Record<ItemType, LucideIcon> = {
  consumable: Heart,
  scroll: ScrollText,
  trap: Skull,
}

export function ItemIcon({
  type,
  className,
}: {
  type: ItemType
  className?: string
}) {
  const Icon = TYPE_ICON[type]
  return (
    <Icon
      className={cn(type === 'consumable' && 'fill-current', className)}
      aria-hidden
    />
  )
}
