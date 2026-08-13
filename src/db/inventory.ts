import { db, type InventoryItem, type Stats } from './db'
import { getGlobalStats, normalizeStats } from '@/hooks/useStreak'
import {
  getItem,
  isItemId,
  type Item,
  type ItemActionResult,
  type ItemId,
} from '@/lib/items'

export type InventoryStack = InventoryItem & { item: Item }

export async function listInventory(): Promise<InventoryStack[]> {
  const rows = await db.inventory.toArray()
  return rows
    .map((row) => {
      const item = getItem(row.itemId)
      if (!item || row.quantity <= 0) return null
      return { ...row, item }
    })
    .filter((row): row is InventoryStack => row !== null)
}

export async function addInventoryItem(
  itemId: ItemId,
  quantity = 1,
): Promise<InventoryItem> {
  const amount = Math.max(1, Math.floor(quantity))
  const existing = await db.inventory.where('itemId').equals(itemId).first()
  if (existing) {
    const next = { ...existing, quantity: existing.quantity + amount }
    await db.inventory.put(next)
    return next
  }
  const row: InventoryItem = {
    id: crypto.randomUUID(),
    itemId,
    quantity: amount,
  }
  await db.inventory.add(row)
  return row
}

export async function buyItem(
  itemId: ItemId,
): Promise<{ item: Item; stats: Stats; stack: InventoryItem }> {
  const item = getItem(itemId)
  if (!item) throw new Error('Unknown item')

  const stats = await getGlobalStats()
  if (stats.coins < item.value) {
    throw new Error('Not enough coins')
  }

  return db.transaction('rw', db.stats, db.inventory, async () => {
    const nextStats = normalizeStats({
      ...stats,
      coins: stats.coins - item.value,
    })
    const stack = await addInventoryItem(itemId)
    await db.stats.put(nextStats)
    return { item, stats: nextStats, stack }
  })
}

/** Apply an item's effect to stats without consuming inventory (loot Use Now / traps). */
export async function applyItemEffect(
  itemId: string,
  options: { deferRewards?: boolean } = {},
): Promise<
  ItemActionResult & {
    item: Item
    recovered: boolean
    becameExhausted: boolean
    leveledUp: boolean
  }
> {
  if (!isItemId(itemId)) throw new Error('Unknown item')
  const item = getItem(itemId)
  if (!item) throw new Error('Unknown item')

  const existing = await getGlobalStats()
  const result = item.action(existing)
  const persistRewards = !options.deferRewards
  const next = normalizeStats({
    ...result.stats,
    exp: persistRewards ? result.stats.exp : existing.exp,
    coins: persistRewards ? result.stats.coins : existing.coins,
  })
  await db.stats.put(next)
  return {
    ...result,
    stats: next,
    item,
    recovered: existing.isExhausted && next.hearts > 0,
    becameExhausted: !existing.isExhausted && next.hearts <= 0,
    leveledUp: persistRewards && next.level > existing.level,
  }
}

export async function useInventoryItem(itemId: string): Promise<
  ItemActionResult & {
    item: Item
    recovered: boolean
    becameExhausted: boolean
    leveledUp: boolean
  }
> {
  if (!isItemId(itemId)) throw new Error('Unknown item')
  const item = getItem(itemId)
  if (!item) throw new Error('Unknown item')

  return db.transaction('rw', db.stats, db.inventory, async () => {
    const stack = await db.inventory.where('itemId').equals(itemId).first()
    if (!stack || stack.quantity < 1) throw new Error('Item not in inventory')

    const existing = await getGlobalStats()
    const result = item.action(existing)
    const next = normalizeStats({
      ...result.stats,
      coins: existing.coins,
    })
    await db.stats.put(next)

    if (stack.quantity <= 1) {
      await db.inventory.delete(stack.id)
    } else {
      await db.inventory.put({ ...stack, quantity: stack.quantity - 1 })
    }

    return {
      ...result,
      stats: next,
      item,
      recovered: existing.isExhausted && next.hearts > 0,
      becameExhausted: !existing.isExhausted && next.hearts <= 0,
      leveledUp: next.level > existing.level,
    }
  })
}
