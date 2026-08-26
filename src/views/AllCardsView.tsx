import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import {
  addCard,
  db,
  deleteCard,
  resetCardProgress,
  updateCard,
  type Card,
  type Deck,
} from '@/db'
import { CardsAccordion } from '@/components/CardsAccordion'
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
  const [deckFilter, setDeckFilter] = useState(getStoredDeckFilter)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [saving, setSaving] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [listRevision, setListRevision] = useState(0)

  const selectedDeckId = deckFilter === ALL_DECKS_VALUE ? null : deckFilter
  const selectedDeckName =
    selectedDeckId == null
      ? 'All cards'
      : (decks.find((deck) => deck.id === selectedDeckId)?.name ?? 'Deck')

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

  function bumpList() {
    setListRevision((n) => n + 1)
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
      bumpList()
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
    bumpList()
  }

  async function handleAssigned(card: Card, deck: Deck) {
    toast.success(`Assigned “${card.front}” to “${deck.name}”.`)
    bumpList()
  }

  async function handleDelete(card: Card) {
    const confirmed = window.confirm(
      `Delete “${card.front}”? This removes the card, image, and review stats.`,
    )
    if (!confirmed) return
    await deleteCard(card.id)
    toast.success('Card deleted.')
    bumpList()
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

      <CardsAccordion
        deckId={selectedDeckId}
        decks={decks}
        open={listOpen}
        onOpenChange={setListOpen}
        revision={listRevision}
        listId="hub-card-list"
        onEdit={openEdit}
        onReset={(card) => void handleReset(card)}
        onDelete={(card) => void handleDelete(card)}
        onAssigned={(card, deck) => void handleAssigned(card, deck)}
      />

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
