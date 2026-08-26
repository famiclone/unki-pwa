import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Download, Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import {
  addCard,
  db,
  deleteCard,
  exportDeck,
  resetCardProgress,
  updateCard,
  useDb,
  type Card,
  type Deck,
} from '../db'
import { CardsAccordion } from '@/components/CardsAccordion'
import {
  CardFormDialog,
  type CardFormValues,
} from '@/components/CardFormDialog'
import './DeckEditorView.css'
import './DecksView.css'

async function fileToBlob(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  return new Blob([buffer], { type: file.type || 'application/octet-stream' })
}

export function DeckEditorView() {
  const { deckId = '' } = useParams<{ deckId: string }>()
  const { cards, decks } = useDb(deckId)
  const deck = useLiveQuery(() => db.decks.get(deckId), [deckId])

  const [front, setFront] = useState('')
  const [romaji, setRomaji] = useState('')
  const [back, setBack] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [listRevision, setListRevision] = useState(0)
  const [listOpen, setListOpen] = useState(true)

  useEffect(() => {
    setFront('')
    setRomaji('')
    setBack('')
    setImageFile(null)
    setFileInputKey((key) => key + 1)
  }, [deckId])

  function bumpList() {
    setListRevision((n) => n + 1)
  }

  async function handleCreateCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!deckId || !front.trim() || !back.trim() || saving) return

    setSaving(true)
    try {
      const image = imageFile ? await fileToBlob(imageFile) : undefined
      await addCard({
        deckId,
        front,
        romaji: romaji.trim() || undefined,
        back,
        image,
      })
      setFront('')
      setRomaji('')
      setBack('')
      setImageFile(null)
      setFileInputKey((key) => key + 1)
      setListOpen(true)
      bumpList()
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    if (!deckId || exporting) return
    setExporting(true)
    setStatus(null)
    try {
      await exportDeck(deckId)
      setStatus('Deck exported.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  function openEdit(card: Card) {
    setEditingCard(card)
    setEditOpen(true)
  }

  async function handleEditSubmit(values: CardFormValues) {
    if (!editingCard) return
    setEditSaving(true)
    setStatus(null)
    try {
      await updateCard({
        id: editingCard.id,
        front: values.front,
        back: values.back,
        romaji: values.romaji,
        example: values.example,
      })
      setStatus('Card updated.')
      setEditOpen(false)
      setEditingCard(null)
      bumpList()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed.')
    } finally {
      setEditSaving(false)
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

  async function handleDelete(card: Card) {
    const confirmed = window.confirm(
      `Delete “${card.front}”? This removes the card, image, and review stats.`,
    )
    if (!confirmed) return
    await deleteCard(card.id)
    toast.success('Card deleted.')
    bumpList()
  }

  function handleAssigned(card: Card, assignedDeck: Deck) {
    toast.success(`Assigned “${card.front}” to “${assignedDeck.name}”.`)
    bumpList()
  }

  if (deck === undefined) {
    return <p className="empty-state">Loading deck…</p>
  }

  if (deck === null) {
    return (
      <section>
        <p className="empty-state">Deck not found.</p>
        <Link to="/decks" className="back-link">
          <ArrowLeft className="size-5" aria-hidden />
          Back to decks
        </Link>
      </section>
    )
  }

  return (
    <section className="deck-editor flex flex-col gap-6">
      <Link to="/decks" className="text-back">
        <ArrowLeft className="size-5" aria-hidden />
        Decks
      </Link>

      <header className="view-header">
        <h1>{deck.name}</h1>
        {deck.description ? <p>{deck.description}</p> : null}
        <p>
          {cards.length === 1 ? '1 card' : `${cards.length} cards`} in this deck.
        </p>
      </header>

      <div className="header-actions">
        <button
          type="button"
          className="secondary-btn"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          <Download className="size-5" aria-hidden />
          {exporting ? 'Exporting…' : 'Export'}
        </button>
        {cards.length > 0 ? (
          <Link to={`/decks/${deckId}/study`} className="study-cta">
            <BookOpen className="size-5" aria-hidden />
            Study deck
          </Link>
        ) : null}
      </div>

      {status ? <p className="status-message">{status}</p> : null}

      <form className="create-card-form" onSubmit={handleCreateCard}>
        <h2 className="form-title">Create card</h2>

        <label htmlFor="card-front">Front</label>
        <input
          id="card-front"
          type="text"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Vocabulary (e.g. 食べる)"
          required
          autoComplete="off"
        />

        <label htmlFor="card-romaji">Example (Front)</label>
        <input
          id="card-romaji"
          type="text"
          value={romaji}
          onChange={(e) => setRomaji(e.target.value)}
          placeholder="Pronunciation (e.g. taberu)"
          autoComplete="off"
        />

        <label htmlFor="card-back">Back</label>
        <input
          id="card-back"
          type="text"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Translation (e.g. to eat)"
          required
          autoComplete="off"
        />

        <label htmlFor="card-image">Image (optional)</label>
        <input
          key={fileInputKey}
          id="card-image"
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />

        <button type="submit" disabled={saving || !front.trim() || !back.trim()}>
          <Plus className="size-5" aria-hidden />
          {saving ? 'Saving…' : 'Add card'}
        </button>
      </form>

      <CardsAccordion
        deckId={deckId}
        decks={decks}
        open={listOpen}
        onOpenChange={setListOpen}
        revision={listRevision}
        listId="deck-card-list"
        onEdit={openEdit}
        onReset={(card) => void handleReset(card)}
        onDelete={(card) => void handleDelete(card)}
        onAssigned={handleAssigned}
      />

      <CardFormDialog
        open={editOpen}
        mode="edit"
        card={editingCard}
        saving={editSaving}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditingCard(null)
        }}
        onSubmit={handleEditSubmit}
      />
    </section>
  )
}
