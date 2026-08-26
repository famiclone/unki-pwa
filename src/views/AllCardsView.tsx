import { useDeferredValue, useEffect, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import {
  addCard,
  db,
  deleteCard,
  resetCardProgress,
  updateCard,
  type Card,
  type CardStateFilter,
  type Deck,
} from '@/db'
import { useInfiniteCards } from '@/hooks/useInfiniteCards'
import { CardList } from '@/components/CardList'
import { WelcomeBanner } from '@/components/WelcomeBanner'
import { DailyProgress } from '@/components/DailyProgress'
import { CardStatBlocks } from '@/components/StatsDashboard'
import { useDailyProgress } from '@/hooks/useDailyProgress'
import {
  CardFormDialog,
  type CardFormValues,
} from '@/components/CardFormDialog'
import {
  ALL_DECKS_VALUE,
  getStoredDeckFilter,
  persistDeckFilter,
  resolveDeckFilter,
} from '@/lib/deckFilter'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AllCardsView() {
  const decksQuery = useLiveQuery(() => db.decks.orderBy('createdAt').toArray(), [])
  const decks = decksQuery ?? []
  const { loading: progressLoading } = useDailyProgress()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [state, setState] = useState<CardStateFilter>('all')
  const [deckFilter, setDeckFilter] = useState(getStoredDeckFilter)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [saving, setSaving] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  const selectedDeckId = deckFilter === ALL_DECKS_VALUE ? null : deckFilter
  const selectedDeckName =
    selectedDeckId == null
      ? 'All cards'
      : (decks.find((deck) => deck.id === selectedDeckId)?.name ?? 'Deck')

  const { items, hasMore, loading, error, loadMore, refresh } = useInfiniteCards(
    deferredSearch,
    state,
    selectedDeckId,
  )

  useEffect(() => {
    if (decksQuery === undefined) return

    const resolved = resolveDeckFilter(
      deckFilter,
      decks.map((deck) => deck.id),
    )
    if (resolved !== deckFilter) {
      setDeckFilter(resolved)
      persistDeckFilter(resolved)
    }
  }, [deckFilter, decks, decksQuery])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  function handleDeckFilterChange(value: string) {
    setDeckFilter(value)
    persistDeckFilter(value)
  }

  function openCreate() {
    setFormMode('create')
    setEditingCard(null)
    setFormOpen(true)
  }

  function openEdit(card: Card) {
    setFormMode('edit')
    setEditingCard(card)
    setFormOpen(true)
  }

  async function handleFormSubmit(values: CardFormValues) {
    setSaving(true)
    try {
      if (formMode === 'create') {
        await addCard({
          deckId: selectedDeckId ?? undefined,
          front: values.front,
          back: values.back,
          romaji: values.romaji,
          example: values.example,
        })
        toast.success('Card added.')
        setListOpen(true)
      } else if (editingCard) {
        await updateCard({
          id: editingCard.id,
          front: values.front,
          back: values.back,
          romaji: values.romaji,
          example: values.example,
        })
        toast.success('Card updated.')
      }
      setFormOpen(false)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset(card: Card) {
    const confirmed = window.confirm(
      `Reset progress for “${card.front}” back to new?`,
    )
    if (!confirmed) return
    await resetCardProgress(card.id)
    toast.success('Progress reset.')
    await refresh()
  }

  async function handleAssigned(card: Card, deck: Deck) {
    toast.success(`Assigned “${card.front}” to “${deck.name}”.`)
    await refresh()
  }

  async function handleDelete(card: Card) {
    const confirmed = window.confirm(
      `Delete “${card.front}”? This removes the card, image, and review stats.`,
    )
    if (!confirmed) return
    await deleteCard(card.id)
    toast.success('Card deleted.')
    await refresh()
  }

  return (
    <section className="flex flex-col gap-8">
      <WelcomeBanner />

      {!progressLoading ? <CardStatBlocks /> : null}

      <div className="w-full">
        <Select value={deckFilter} onValueChange={handleDeckFilterChange}>
          <SelectTrigger
            aria-label="Deck"
            className="h-16 rounded-xl px-4 text-xl"
          >
            <SelectValue placeholder="All Decks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DECKS_VALUE}>All Decks</SelectItem>
            {decks.map((deck) => (
              <SelectItem key={deck.id} value={deck.id}>
                {deck.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DailyProgress
        onAddCards={openCreate}
        deckId={selectedDeckId}
        deckName={selectedDeckName}
        showStats={false}
      />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 border-b border-border/60 py-2 text-left text-foreground transition-colors hover:text-foreground/80"
          aria-expanded={listOpen}
          aria-controls="hub-card-list"
          onClick={() => setListOpen((open) => !open)}
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
            <div id="hub-card-list">
              <CardList
                items={items}
                decks={decks}
                hasMore={hasMore}
                loading={loading}
                onLoadMore={() => void loadMore()}
                onEdit={openEdit}
                onReset={(card) => void handleReset(card)}
                onDelete={(card) => void handleDelete(card)}
                onAssigned={(card, deck) => void handleAssigned(card, deck)}
              />
            </div>
          </>
        ) : null}
      </div>

      <CardFormDialog
        open={formOpen}
        mode={formMode}
        card={editingCard}
        saving={saving}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
      />
    </section>
  )
}
