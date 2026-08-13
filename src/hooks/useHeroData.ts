import { useLiveQuery } from 'dexie-react-hooks'
import { listInventory, type InventoryStack } from '@/db/inventory'
import { createDefaultStats, getGlobalStats } from '@/hooks/useStreak'
import type { Stats } from '@/db/db'

export type PopulatedInventoryItem = InventoryStack

export type HeroData = {
  stats: Stats
  populatedInventory: PopulatedInventoryItem[]
  loading: boolean
}

export function useHeroData(): HeroData {
  const data = useLiveQuery(async () => {
    const [stats, populatedInventory] = await Promise.all([
      getGlobalStats(),
      listInventory(),
    ])
    return { stats, populatedInventory }
  }, [])

  return {
    stats: data?.stats ?? createDefaultStats(),
    populatedInventory: data?.populatedInventory ?? [],
    loading: data === undefined,
  }
}
