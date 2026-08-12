import { type ChangeEvent, type FormEvent, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Download, Plus, Trash2, Upload } from 'lucide-react'
import { exportDeck, importDeck, useDb } from '../db'
import './DecksView.css'

export function DecksView() {
  const { decks, createDeck, deleteDeck } = useDb()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || saving) return

    setSaving(true)
    setStatus(null)
    try {
      await createDeck({ name })
      setName('')
    } finally {
      setSaving(false)
    }
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

      <form className="create-deck-form" onSubmit={handleCreate}>
        <label htmlFor="deck-name">New deck</label>
        <div className="create-deck-row">
          <input
            id="deck-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Genki Lesson 1"
            autoComplete="off"
            required
          />
          <button type="submit" disabled={saving || !name.trim()}>
            <Plus size={18} aria-hidden />
            Create
          </button>
        </div>
      </form>

      {decks.length === 0 ? (
        <p className="empty-state">No decks yet. Create one to get started.</p>
      ) : (
        <ul className="deck-list">
          {decks.map((deck) => (
            <li key={deck.id} className="deck-item">
              <Link to={`/decks/${deck.id}`} className="deck-link">
                <span className="deck-name">{deck.name}</span>
                <span className="deck-meta">
                  {new Date(deck.createdAt).toLocaleDateString()}
                </span>
              </Link>
              <div className="deck-actions">
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
    </section>
  )
}
