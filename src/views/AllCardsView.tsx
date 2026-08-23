import { useDeferredValue, useEffect, useState } from 'react'
import { ChevronDown, FolderPlus, Search } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  addCard,
  createDeck,
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
  DeckFormDialog,
  type DeckFormData,
} from '@/components/DeckFormDialog'
import {
  ALL_DECKS_VALUE,
  getStoredDeckFilter,
  persistDeckFilter,
  resolveDeckFilter,
} from '@/lib/deckFilter'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  const { cardsToStudy, loading: progressLoading } = useDailyProgress()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [state, setState] = useState<CardStateFilter>('all')
  const [deckFilter, setDeckFilter] = useState(getStoredDeckFilter)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [deckDialogOpen, setDeckDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
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
    setStatus(null)
    try {
      if (formMode === 'create') {
        await addCard({
          deckId: selectedDeckId ?? undefined,
          front: values.front,
          back: values.back,
          romaji: values.romaji,
          example: values.example,
        })
        setStatus('Card added.')
        setListOpen(true)
      } else if (editingCard) {
        await updateCard({
          id: editingCard.id,
          front: values.front,
          back: values.back,
          romaji: values.romaji,
          example: values.example,
        })
        setStatus('Card updated.')
      }
      setFormOpen(false)
      await refresh()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeckSave(deckData: DeckFormData) {
    setStatus(null)
    await createDeck({
      name: deckData.name,
      description: deckData.description,
      image: deckData.image,
      color: deckData.color,
    })
    setStatus(`Deck “${deckData.name}” created.`)
  }

  async function handleReset(card: Card) {
    const confirmed = window.confirm(
      `Reset progress for “${card.front}” back to new?`,
    )
    if (!confirmed) return
    await resetCardProgress(card.id)
    setStatus('Progress reset.')
    await refresh()
  }

  async function handleAssigned(card: Card, deck: Deck) {
    setStatus(`Assigned “${card.front}” to “${deck.name}”.`)
    await refresh()
  }

  async function handleDelete(card: Card) {
    const confirmed = window.confirm(
      `Delete “${card.front}”? This removes the card, image, and review stats.`,
    )
    if (!confirmed) return
    await deleteCard(card.id)
    setStatus('Card deleted.')
    await refresh()
  }

  return (
    <section className="flex flex-col gap-8">
      <WelcomeBanner />

      {!progressLoading && cardsToStudy > 0 ? <CardStatBlocks /> : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-44">
            <Select
              value={state}
              onValueChange={(value) => setState(value as CardStateFilter)}
            >
              <SelectTrigger aria-label="Card state">
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

          <div className="w-full sm:w-48">
            <Select value={deckFilter} onValueChange={handleDeckFilterChange}>
              <SelectTrigger aria-label="Deck">
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

          <div className="flex shrink-0 sm:ml-auto">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="New deck"
              title="New deck"
              onClick={() => setDeckDialogOpen(true)}
            >
              <FolderPlus />
            </Button>
          </div>
        </div>

        {status ? <p className="text-sm text-foreground">{status}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
          className="flex h-12 w-full items-center justify-between rounded-xl border border-border/80 bg-[color-mix(in_oklab,var(--card-bg)_55%,transparent)] px-4 text-left text-sm font-semibold text-foreground"
          aria-expanded={listOpen}
          aria-controls="hub-card-list"
          onClick={() => setListOpen((open) => !open)}
        >
          <span>Cards</span>
          <ChevronDown
            className={cn(
              'size-5 text-muted-foreground transition-transform',
              listOpen && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {listOpen ? (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search front, back, romaji, example…"
                className="pl-9"
                aria-label="Search cards"
              />
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

      <DeckFormDialog
        isOpen={deckDialogOpen}
        onClose={() => setDeckDialogOpen(false)}
        onSave={handleDeckSave}
      />
    </section>
  )
}
