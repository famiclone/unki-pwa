import { useDeferredValue, useState } from 'react'
import { Download, Plus, Search } from 'lucide-react'
import {
  addCard,
  deleteCard,
  exportAllCards,
  resetCardProgress,
  updateCard,
  type Card,
  type CardStateFilter,
} from '@/db'
import { useInfiniteCards } from '@/hooks/useInfiniteCards'
import { CardList } from '@/components/CardList'
import {
  CardFormDialog,
  fileToBlob,
  type CardFormValues,
} from '@/components/CardFormDialog'
import { StatsDashboard } from '@/components/StatsDashboard'
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
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [state, setState] = useState<CardStateFilter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const { items, hasMore, loading, error, loadMore, refresh } = useInfiniteCards(
    deferredSearch,
    state,
  )

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
        const image = values.imageFile
          ? await fileToBlob(values.imageFile)
          : undefined
        await addCard({
          front: values.front,
          back: values.back,
          romaji: values.romaji,
          example: values.example,
          image,
        })
        setStatus('Card added.')
      } else if (editingCard) {
        let image: Blob | File | null | undefined
        if (values.clearImage) image = null
        else if (values.imageFile) image = await fileToBlob(values.imageFile)
        else image = undefined

        await updateCard({
          id: editingCard.id,
          front: values.front,
          back: values.back,
          romaji: values.romaji,
          example: values.example,
          image,
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

  async function handleReset(card: Card) {
    const confirmed = window.confirm(
      `Reset progress for “${card.front}” back to new?`,
    )
    if (!confirmed) return
    await resetCardProgress(card.id)
    setStatus('Progress reset.')
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

  async function handleExport() {
    setExporting(true)
    setStatus(null)
    try {
      await exportAllCards()
      setStatus('Cards exported.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-3xl tracking-tight">All Cards</h1>
            <p className="m-0 text-sm text-muted-foreground">
              Browse, filter, and manage every card in your library.
            </p>
          </div>
          <Button type="button" size="icon" aria-label="Add card" onClick={openCreate}>
            <Plus />
          </Button>
        </div>
      </header>

      <StatsDashboard />

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

        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search front, back, romaji, example…"
            className="pl-9"
            aria-label="Search cards"
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Export all cards"
          title="Export"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          <Download />
        </Button>
      </div>

      {status ? <p className="text-sm text-foreground">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <CardList
        items={items}
        hasMore={hasMore}
        loading={loading}
        onLoadMore={() => void loadMore()}
        onEdit={openEdit}
        onReset={(card) => void handleReset(card)}
        onDelete={(card) => void handleDelete(card)}
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
