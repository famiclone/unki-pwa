import type { Stats } from '@/db/db'
import { calculateLevelStats, deriveCombatStats, snapHearts } from '@/lib/gamification'
import { generateLootName } from '@/lib/nameGenerator'

export type ItemType = 'consumable' | 'scroll' | 'trap' | 'trinket'

export type ItemId =
  | 'health_potion'
  | 'knowledge_scroll'
  | 'mimic_trap'
  | 'escape_rope'
  | 'random_trinket'

export const RANDOM_TRINKET_ID = 'random_trinket' as const
export const TRINKET_DROP_CHANCE = 0.6

/** Consumables that can be used from the in-dungeon bag. */
export const RUN_BAG_ITEM_IDS: readonly ItemId[] = [
  'health_potion',
  'escape_rope',
]

export function isRunBagItemId(itemId: string): itemId is ItemId {
  return (RUN_BAG_ITEM_IDS as readonly string[]).includes(itemId)
}

/** Result of applying an item to the current stats row. */
export type ItemActionResult = {
  stats: Stats
  heartsDelta: number
  expDelta: number
  message: string
}

export interface Item {
  id: ItemId
  name: string
  description: string
  type: ItemType
  /** Coin price in the shop, or sell value for trinkets. */
  value: number
  action: (stats: Stats) => ItemActionResult
}

function withCombat(stats: Stats, hearts: number, exp: number): Stats {
  const nextExp = Math.max(0, Math.floor(exp))
  const { currentLevel } = calculateLevelStats(nextExp)
  const { attack, maxHearts } = deriveCombatStats(currentLevel)
  const nextHearts = Math.min(maxHearts, Math.max(0, snapHearts(hearts)))
  return {
    ...stats,
    exp: nextExp,
    level: currentLevel,
    hearts: nextHearts,
    maxHearts,
    attack,
    isExhausted: nextHearts <= 0,
  }
}

export const ITEMS: Record<ItemId, Item> = {
  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'Restores 1 heart.',
    type: 'consumable',
    value: 25,
    action(stats) {
      const hearts = Math.min(stats.maxHearts, snapHearts(stats.hearts + 1))
      return {
        stats: withCombat(stats, hearts, stats.exp),
        heartsDelta: hearts - stats.hearts,
        expDelta: 0,
        message: hearts > stats.hearts ? '+1 ❤️' : 'Hearts are already full',
      }
    },
  },
  knowledge_scroll: {
    id: 'knowledge_scroll',
    name: 'Knowledge Scroll',
    description: 'Grants 50 EXP.',
    type: 'scroll',
    value: 50,
    action(stats) {
      return {
        stats: withCombat(stats, stats.hearts, stats.exp + 50),
        heartsDelta: 0,
        expDelta: 50,
        message: '+50 EXP',
      }
    },
  },
  mimic_trap: {
    id: 'mimic_trap',
    name: 'Mimic Trap',
    description: 'A cursed chest. Deals 1.5 heart damage.',
    type: 'trap',
    value: 10,
    action(stats) {
      const hearts = Math.max(0, snapHearts(stats.hearts - 1.5))
      return {
        stats: withCombat(stats, hearts, stats.exp),
        heartsDelta: hearts - stats.hearts,
        expDelta: 0,
        message: '-1.5 ❤️',
      }
    },
  },
  escape_rope: {
    id: 'escape_rope',
    name: 'Escape Rope',
    description:
      'Use during a Dungeon Run to immediately teleport out and keep all accumulated EXP and Coins.',
    type: 'consumable',
    value: 40,
    action(stats) {
      return {
        stats,
        heartsDelta: 0,
        expDelta: 0,
        message: 'Only works during a dungeon run.',
      }
    },
  },
  random_trinket: {
    id: 'random_trinket',
    name: 'Strange Relic',
    description: 'A valuable artifact. A merchant would pay good coins for this.',
    type: 'trinket',
    value: 15,
    action(stats) {
      return {
        stats: { ...stats, coins: stats.coins + 15 },
        heartsDelta: 0,
        expDelta: 0,
        message: 'Sold for 15 🪙',
      }
    },
  },
}

export const ITEM_LIST: Item[] = Object.values(ITEMS).filter(
  (item) => item.type !== 'trinket',
)

export const SHOP_ITEMS: Item[] = ITEM_LIST.filter((item) => item.type !== 'trap')

const USEFUL_CHEST_LOOT: Item[] = [
  ITEMS.health_potion,
  ITEMS.knowledge_scroll,
]

/** Chance a successful review (Good/Easy) reveals a chest instead of the next card. */
export const CHEST_DROP_CHANCE = 0.15

export function pickRandomLoot(table: readonly Item[] = ITEM_LIST): Item {
  const index = Math.floor(Math.random() * table.length)
  return table[index] ?? ITEM_LIST[0]!
}

export function createRandomTrinket(): Item {
  const value = Math.floor(Math.random() * 20) + 5
  return {
    ...ITEMS.random_trinket,
    name: generateLootName(),
    description: 'A valuable artifact. A merchant would pay good coins for this.',
    value,
    action(stats) {
      return {
        stats: { ...stats, coins: stats.coins + value },
        heartsDelta: 0,
        expDelta: 0,
        message: `Sold for ${value} 🪙`,
      }
    },
  }
}

/** 60% named trinket, 40% potion or scroll. */
export function pickChestLoot(): Item {
  if (Math.random() < TRINKET_DROP_CHANCE) return createRandomTrinket()
  return pickRandomLoot(USEFUL_CHEST_LOOT)
}

export function getItem(itemId: string): Item | undefined {
  return ITEMS[itemId as ItemId]
}

export function isItemId(value: string): value is ItemId {
  return value in ITEMS
}
