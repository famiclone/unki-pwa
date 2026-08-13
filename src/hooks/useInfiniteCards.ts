import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCardsPage,
  type CardStateFilter,
  type CardsPageResult,
} from '@/db'

const PAGE_SIZE = 20

export type InfiniteCardItem = CardsPageResult['items'][number]

export function useInfiniteCards(
  search: string,
  state: CardStateFilter,
  deckId?: string | null,
) {
  const [items, setItems] = useState<InfiniteCardItem[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const resetAndLoad = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const page = await getCardsPage({
        offset: 0,
        limit: PAGE_SIZE,
        search,
        state,
        deckId,
      })
      if (id !== requestId.current) return
      setItems(page.items)
      setOffset(page.items.length)
      setHasMore(page.hasMore)
    } catch (err) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Failed to load cards')
      setItems([])
      setOffset(0)
      setHasMore(false)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [search, state, deckId])

  useEffect(() => {
    void resetAndLoad()
  }, [resetAndLoad])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const id = requestId.current
    setLoading(true)
    setError(null)
    try {
      const page = await getCardsPage({
        offset,
        limit: PAGE_SIZE,
        search,
        state,
        deckId,
      })
      if (id !== requestId.current) return
      setItems((prev) => [...prev, ...page.items])
      setOffset((prev) => prev + page.items.length)
      setHasMore(page.hasMore)
    } catch (err) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Failed to load more cards')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [hasMore, loading, offset, search, state, deckId])

  const refresh = useCallback(async () => {
    await resetAndLoad()
  }, [resetAndLoad])

  return {
    items,
    hasMore,
    loading,
    error,
    loadMore,
    refresh,
    pageSize: PAGE_SIZE,
  }
}
