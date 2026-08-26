import { useEffect, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import type { Card, Deck } from '@/db'
import type { InfiniteCardItem } from '@/hooks/useInfiniteCards'
import { CardRow } from '@/components/CardRow'

type CardListProps = {
  items: InfiniteCardItem[]
  decks: Deck[]
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  onEdit: (card: Card) => void
  onReset: (card: Card) => void
  onDelete: (card: Card) => void
  onAssigned?: (card: Card, deck: Deck) => void
}

export function CardList({
  items,
  decks,
  hasMore,
  loading,
  onLoadMore,
  onEdit,
  onReset,
  onDelete,
  onAssigned,
}: CardListProps) {
  const deckById = useMemo(() => {
    const map = new Map<string, Deck>()
    for (const deck of decks) map.set(deck.id, deck)
    return map
  }, [decks])

  const { ref, inView } = useInView({
    rootMargin: '200px 0px',
    threshold: 0,
  })

  useEffect(() => {
    if (inView && hasMore && !loading) {
      onLoadMore()
    }
  }, [inView, hasMore, loading, onLoadMore])

  if (items.length === 0 && !loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No cards match your filters. Add a card to get started.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map(({ card }) => (
        <CardRow
          key={card.id}
          card={card}
          decks={decks}
          deckColor={card.deckId ? deckById.get(card.deckId)?.color : undefined}
          onEdit={onEdit}
          onReset={onReset}
          onDelete={onDelete}
          onAssigned={onAssigned}
        />
      ))}
      <li ref={ref} className="py-3 text-center text-xs text-muted-foreground">
        {loading ? 'Loading…' : hasMore ? 'Scroll for more' : 'End of list'}
      </li>
    </ul>
  )
}
