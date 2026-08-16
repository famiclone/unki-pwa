import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Download, Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addCard, db, exportDeck, useDb } from '../db'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { useDeckStats } from '@/hooks/useDeckStats'
import { RunPrepModal } from '@/components/RunPrepModal'
import type { Card } from '../db'
import './DeckEditorView.css'
import './DecksView.css'

async function fileToBlob(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  return new Blob([buffer], { type: file.type || 'application/octet-stream' })
}

function CardRow({ card }: { card: Card }) {
  const imageUrl = useObjectUrl(card.image)

  return (
    <li className="card-item">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="card-thumb" />
      ) : (
        <div className="card-thumb card-thumb--empty" aria-hidden />
      )}
      <div className="card-body">
        <div className="card-front">{card.front}</div>
        {card.romaji ? <div className="card-romaji">{card.romaji}</div> : null}
        <div className="card-back">{card.back}</div>
      </div>
    </li>
  )
}

export function DeckEditorView() {
  const { deckId = '' } = useParams<{ deckId: string }>()
  const { cards } = useDb(deckId)
  const deck = useLiveQuery(() => db.decks.get(deckId), [deckId])
  const deckStats = useDeckStats()

  const [front, setFront] = useState('')
  const [romaji, setRomaji] = useState('')
  const [back, setBack] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const [prepOpen, setPrepOpen] = useState(false)

  useEffect(() => {
    setFront('')
    setRomaji('')
    setBack('')
    setImageFile(null)
    setFileInputKey((key) => key + 1)
  }, [deckId])

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

  if (deck === undefined) {
    return <p className="empty-state">Loading deck…</p>
  }

  if (deck === null) {
    return (
      <section>
        <p className="empty-state">Deck not found.</p>
        <Link to="/decks" className="back-link">
          <ArrowLeft size={16} aria-hidden />
          Back to decks
        </Link>
      </section>
    )
  }

  return (
    <section className="deck-editor">
      <Link to="/decks" className="text-back">
        <ArrowLeft size={16} aria-hidden />
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
          <Download size={18} aria-hidden />
          {exporting ? 'Exporting…' : 'Export'}
        </button>
        {cards.length > 0 ? (
          <button
            type="button"
            className="study-cta"
            onClick={() => setPrepOpen(true)}
          >
            <BookOpen size={18} aria-hidden />
            Study deck
          </button>
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
          <Plus size={18} aria-hidden />
          {saving ? 'Saving…' : 'Add card'}
        </button>
      </form>

      {cards.length === 0 ? (
        <p className="empty-state">No cards yet. Add one with the form above.</p>
      ) : (
        <ul className="card-list">
          {cards.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </ul>
      )}

      <RunPrepModal
        open={prepOpen}
        onOpenChange={setPrepOpen}
        deckId={deckId}
        deckName={deck.name}
        dueCount={deckStats[deckId]?.dueToday ?? 0}
      />
    </section>
  )
}
