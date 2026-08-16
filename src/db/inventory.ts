import { db, type InventoryItem, type Stats } from './db'
import { getGlobalStats, normalizeStats } from '@/hooks/useStreak'
import {
  getItem,
  isItemId,
  RANDOM_TRINKET_ID,
  type Item,
  type ItemActionResult,
  type ItemId,
} from '@/lib/items'

export type InventoryStack = InventoryItem & { item: Item }

function sellAction(value: number): Item['action'] {
  return (stats) => ({
    stats: { ...stats, coins: stats.coins + value },
    heartsDelta: 0,
    expDelta: 0,
    message: `Sold for ${value} 🪙`,
  })
}

function hydrateStack(row: InventoryItem): InventoryStack | null {
  const item = getItem(row.itemId)
  if (!item || row.quantity <= 0) return null
  if (row.itemId === RANDOM_TRINKET_ID) {
    const value = row.value ?? item.value
    return {
      ...row,
      item: {
        ...item,
        name: row.name ?? item.name,
        description: row.description ?? item.description,
        value,
        action: sellAction(value),
      },
    }
  }
  return { ...row, item }
}

export async function listInventory(): Promise<InventoryStack[]> {
  const rows = await db.inventory.toArray()
  return rows
    .map(hydrateStack)
    .filter((row): row is InventoryStack => row !== null)
}

export async function addInventoryItem(
  itemId: ItemId,
  quantity = 1,
  instance?: { name?: string; description?: string; value?: number },
): Promise<InventoryItem> {
  const amount = Math.max(1, Math.floor(quantity))

  if (itemId === RANDOM_TRINKET_ID) {
    const row: InventoryItem = {
      id: crypto.randomUUID(),
      itemId,
      quantity: 1,
      name: instance?.name,
      description: instance?.description,
      value: instance?.value,
    }
    await db.inventory.add(row)
    return row
  }

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

export function getSellPrice(stack: InventoryStack): number {
  if (stack.item.type === 'trinket') {
    return Math.max(1, Math.floor(stack.item.value))
  }
  return Math.max(1, Math.floor(stack.item.value / 2))
}

/** Flat coin price to fully restore hearts at the Inn. */
export const INN_REST_PRICE = 15

export async function restAtInn(): Promise<Stats> {
  const existing = await getGlobalStats()
  if (existing.hearts >= existing.maxHearts && !existing.isExhausted) {
    throw new Error('You are already fully rested!')
  }
  if (existing.coins < INN_REST_PRICE) {
    throw new Error('Not enough coins for a room!')
  }

  const next = normalizeStats({
    ...existing,
    coins: existing.coins - INN_REST_PRICE,
    hearts: existing.maxHearts,
  })
  await db.stats.put(next)
  return next
}

export async function sellInventoryItem(stackId: string): Promise<{
  item: Item
  coinsGained: number
  stats: Stats
}> {
  return db.transaction('rw', db.stats, db.inventory, async () => {
    const row = await db.inventory.get(stackId)
    if (!row || row.quantity < 1) throw new Error('Item not in inventory')

    const hydrated = hydrateStack(row)
    if (!hydrated) throw new Error('Unknown item')

    const coinsGained = getSellPrice(hydrated)
    const existing = await getGlobalStats()
    const nextStats = normalizeStats({
      ...existing,
      coins: existing.coins + coinsGained,
    })
    await db.stats.put(nextStats)

    if (row.quantity <= 1) {
      await db.inventory.delete(row.id)
    } else {
      await db.inventory.put({ ...row, quantity: row.quantity - 1 })
    }

    return { item: hydrated.item, coinsGained, stats: nextStats }
  })
}

export async function buyItem(
  itemId: ItemId,
): Promise<{ item: Item; stats: Stats; stack: InventoryItem }> {
  const item = getItem(itemId)
  if (!item) throw new Error('Unknown item')
  if (item.type === 'trinket') throw new Error('Trinkets cannot be bought')

  const stats = await getGlobalStats()
  if (stats.coins < item.value) {
    throw new Error('Not enough coins!')
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
  if (!isItemId(itemId) || itemId === RANDOM_TRINKET_ID) {
    throw new Error('Unknown item')
  }
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

export async function useInventoryItem(itemIdOrStackId: string): Promise<
  ItemActionResult & {
    item: Item
    recovered: boolean
    becameExhausted: boolean
    leveledUp: boolean
  }
> {
  return db.transaction('rw', db.stats, db.inventory, async () => {
    const byPrimary = await db.inventory.get(itemIdOrStackId)
    const stack =
      byPrimary ??
      (await db.inventory.where('itemId').equals(itemIdOrStackId).first())
    if (!stack || stack.quantity < 1) throw new Error('Item not in inventory')

    const hydrated = hydrateStack(stack)
    if (!hydrated) throw new Error('Unknown item')
    const { item } = hydrated
    if (!isItemId(item.id)) throw new Error('Unknown item')

    const existing = await getGlobalStats()
    const result = item.action(existing)
    const persistCoins = item.type === 'trinket'
    const next = normalizeStats({
      ...result.stats,
      coins: persistCoins ? result.stats.coins : existing.coins,
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
