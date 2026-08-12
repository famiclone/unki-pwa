import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useDb } from '../db'
import './DecksView.css'

export function DecksView() {
  const { decks, createDeck, deleteDeck } = useDb()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || saving) return

    setSaving(true)
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

  return (
    <section className="decks-view">
      <header className="view-header">
        <h1>Decks</h1>
        <p>Create decks and open one to manage cards.</p>
      </header>

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
