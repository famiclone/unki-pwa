import { type ChangeEvent, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { exportDeck, importDeck, useDb, type Deck } from '../db'
import {
  DeckFormDialog,
  type DeckFormData,
} from '../components/DeckFormDialog'
import './DecksView.css'

export function DecksView() {
  const { decks, createDeck, updateDeck, deleteDeck } = useDb()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  const [importing, setImporting] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  function openCreate() {
    setEditingDeck(null)
    setDialogOpen(true)
  }

  function openEdit(deck: Deck) {
    setEditingDeck(deck)
    setDialogOpen(true)
  }

  async function handleSave(deckData: DeckFormData) {
    setStatus(null)
    if (editingDeck) {
      await updateDeck({
        id: editingDeck.id,
        name: deckData.name,
        description: deckData.description ?? '',
        image: deckData.image,
      })
      setStatus('Deck updated.')
      return
    }

    await createDeck({
      name: deckData.name,
      description: deckData.description,
      image: deckData.image,
    })
    setStatus('Deck created.')
  }

  async function handleDelete(deckId: string, deckName: string) {
    const confirmed = window.confirm(
      `Delete deck “${deckName}” and all of its cards?`,
    )
    if (!confirmed) return
    await deleteDeck(deckId)
  }

  async function handleExport(deckId: string) {
    setExportingId(deckId)
    setStatus(null)
    try {
      await exportDeck(deckId)
      setStatus('Deck exported.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Export failed.')
    } finally {
      setExportingId(null)
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    setStatus(null)
    try {
      const deck = await importDeck(file)
      setStatus(`Imported “${deck.name}”.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="decks-view">
      <header className="view-header">
        <h1>Decks</h1>
        <p>Create decks and open one to manage cards.</p>
      </header>

      <div className="header-actions">
        <button type="button" className="secondary-btn" onClick={openCreate}>
          <Plus size={18} aria-hidden />
          New deck
        </button>
        <button
          type="button"
          className="secondary-btn"
          disabled={importing}
          onClick={() => importInputRef.current?.click()}
        >
          <Upload size={18} aria-hidden />
          {importing ? 'Importing…' : 'Import'}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={handleImport}
        />
      </div>

      {status ? <p className="status-message">{status}</p> : null}

      {decks.length === 0 ? (
        <p className="empty-state">No decks yet. Create one to get started.</p>
      ) : (
        <ul className="deck-list">
          {decks.map((deck) => (
            <li key={deck.id} className="deck-item">
              <Link to={`/decks/${deck.id}`} className="deck-link">
                <span className="deck-name">{deck.name}</span>
                {deck.description ? (
                  <span className="deck-meta">{deck.description}</span>
                ) : null}
                <span className="deck-meta">
                  {new Date(deck.createdAt).toLocaleDateString()}
                </span>
              </Link>
              <div className="deck-actions">
                <button
                  type="button"
                  className="study-link"
                  aria-label={`Edit ${deck.name}`}
                  title="Edit"
                  onClick={() => openEdit(deck)}
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  className="study-link"
                  aria-label={`Export ${deck.name}`}
                  title="Export"
                  disabled={exportingId === deck.id}
                  onClick={() => void handleExport(deck.id)}
                >
                  <Download size={18} />
                </button>
                <Link
                  to={`/decks/${deck.id}/study`}
                  className="study-link"
                  aria-label={`Study ${deck.name}`}
                  title="Study"
                >
                  <BookOpen size={18} />
                </Link>
                <button
                  type="button"
                  className="icon-danger"
                  aria-label={`Delete ${deck.name}`}
                  onClick={() => handleDelete(deck.id, deck.name)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DeckFormDialog
        isOpen={dialogOpen}
        deck={editingDeck}
        onClose={() => {
          setDialogOpen(false)
          setEditingDeck(null)
        }}
        onSave={handleSave}
      />
    </section>
  )
}
