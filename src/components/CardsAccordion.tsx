import { useDeferredValue, useEffect, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Card, CardStateFilter, Deck } from '@/db'
import { useInfiniteCards } from '@/hooks/useInfiniteCards'
import { CardList } from '@/components/CardList'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type CardsAccordionProps = {
  /** When set, list is scoped to this deck. Omit / null = all decks. */
  deckId?: string | null
  decks: Deck[]
  defaultOpen?: boolean
  /** Controlled open state (optional). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Bump to force a list refresh after external creates/edits. */
  revision?: number
  listId?: string
  onEdit: (card: Card) => void
  onReset: (card: Card) => void
  onDelete: (card: Card) => void
  onAssigned?: (card: Card, deck: Deck) => void
}

/** Collapsible Cards browser: search, FSRS state filter, infinite CardList. */
export function CardsAccordion({
  deckId = null,
  decks,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  revision = 0,
  listId = 'card-list',
  onEdit,
  onReset,
  onDelete,
  onAssigned,
}: CardsAccordionProps) {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [state, setState] = useState<CardStateFilter>('all')
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const listOpen = openProp ?? uncontrolledOpen

  function setListOpen(next: boolean) {
    if (openProp === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const { items, hasMore, loading, error, loadMore, refresh } = useInfiniteCards(
    deferredSearch,
    state,
    deckId,
  )

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (revision > 0) void refresh()
  }, [revision, refresh])

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 border-b border-border/60 py-2 text-left text-foreground transition-colors hover:text-foreground/80"
        aria-expanded={listOpen}
        aria-controls={listId}
        onClick={() => setListOpen(!listOpen)}
      >
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-transform',
            listOpen && 'rotate-180',
          )}
          aria-hidden
        />
        <span className="text-lg font-semibold tracking-tight">Cards</span>
      </button>

      {listOpen ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search front, back, romaji, example…"
                className="h-16 rounded-xl pl-10 text-xl sm:text-xl"
                aria-label="Search cards"
              />
            </div>
            <div className="w-full shrink-0 sm:w-44">
              <Select
                value={state}
                onValueChange={(value) => setState(value as CardStateFilter)}
              >
                <SelectTrigger
                  aria-label="Card state"
                  className="h-16 rounded-xl px-4 text-xl"
                >
                  <SelectValue placeholder="Card state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div id={listId}>
            <CardList
              items={items}
              decks={decks}
              hasMore={hasMore}
              loading={loading}
              onLoadMore={() => void loadMore()}
              onEdit={onEdit}
              onReset={onReset}
              onDelete={onDelete}
              onAssigned={onAssigned}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
