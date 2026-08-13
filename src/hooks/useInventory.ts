import { useLiveQuery } from 'dexie-react-hooks'
import {
  buyItem,
  listInventory,
  useInventoryItem,
} from '@/db/inventory'

export function useInventory() {
  const stacks = useLiveQuery(() => listInventory(), [])

  return {
    stacks: stacks ?? [],
    loading: stacks === undefined,
    buyItem,
    useInventoryItem,
  }
}
