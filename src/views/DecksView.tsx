import { type ChangeEvent, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { exportDeck, importDeck, useDb, type Deck } from '../db'
import {
  DeckFormDialog,
  type DeckFormData,
} from '../components/DeckFormDialog'
import { Button } from '@/components/ui/button'
import { useDeckStats } from '@/hooks/useDeckStats'
import {
  DEFAULT_DECK_COLOR,
  getContrastYIQ,
  normalizeHexColor,
} from '@/lib/colorUtils'
import { buildStudyHref } from '@/lib/studyMode'
import { cn } from '@/lib/utils'

export function DecksView() {
  const navigate = useNavigate()
  const { decks, createDeck, updateDeck, deleteDeck } = useDb()
  const deckStats = useDeckStats()
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
        color: deckData.color,
      })
      setStatus('Deck updated.')
      return
    }

    await createDeck({
      name: deckData.name,
      description: deckData.description,
      image: deckData.image,
      color: deckData.color,
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
    <section className="flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="m-0 text-3xl tracking-tight">Decks</h1>
        <p className="m-0 text-sm text-muted-foreground">
          Color-coded collections you can study and share.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={openCreate}>
          <Plus />
          New deck
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={importing}
          onClick={() => importInputRef.current?.click()}
        >
          <Upload />
          {importing ? 'Importing…' : 'Import'}
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={handleImport}
        />
      </div>

      {status ? <p className="text-sm text-foreground">{status}</p> : null}

      {decks.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">
          No decks yet. Create one to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {decks.map((deck) => {
            const color = normalizeHexColor(deck.color ?? DEFAULT_DECK_COLOR)
            const contrast = getContrastYIQ(color)
            const isDarkText = contrast === 'text-black'
            const stats = deckStats[deck.id] ?? { totalCards: 0, dueToday: 0 }

            return (
              <li key={deck.id}>
                <article
                  className={cn(
                    'relative overflow-hidden rounded-3xl p-5 shadow-sm',
                    contrast,
                  )}
                  style={{ backgroundColor: color }}
                >
                  <Link
                    to={`/decks/${deck.id}`}
                    className={cn(
                      'block no-underline',
                      contrast,
                    )}
                  >
                    <h2 className="m-0 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                      {deck.name}
                    </h2>
                    {deck.description ? (
                      <p className="mt-1 mb-0 line-clamp-2 text-sm opacity-80">
                        {deck.description}
                      </p>
                    ) : null}
                  </Link>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-bold',
                        isDarkText
                          ? 'bg-black text-white'
                          : 'bg-white text-black',
                      )}
                    >
                      {stats.totalCards} cards
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-bold',
                        isDarkText
                          ? 'bg-black text-white'
                          : 'bg-white text-black',
                      )}
                    >
                      {stats.dueToday} due today
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'size-9',
                        isDarkText
                          ? 'text-black hover:bg-black/10'
                          : 'text-white hover:bg-white/15',
                      )}
                      aria-label={`Edit ${deck.name}`}
                      onClick={() => openEdit(deck)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'size-9',
                        isDarkText
                          ? 'text-black hover:bg-black/10'
                          : 'text-white hover:bg-white/15',
                      )}
                      aria-label={`Export ${deck.name}`}
                      disabled={exportingId === deck.id}
                      onClick={() => void handleExport(deck.id)}
                    >
                      <Download />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'size-9',
                        isDarkText
                          ? 'text-black hover:bg-black/10'
                          : 'text-white hover:bg-white/15',
                      )}
                      aria-label={`Study ${deck.name}`}
                      onClick={() => navigate(buildStudyHref({ deckId: deck.id }))}
                    >
                      <BookOpen />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'size-9',
                        isDarkText
                          ? 'text-black hover:bg-black/10'
                          : 'text-white hover:bg-white/15',
                      )}
                      aria-label={`Delete ${deck.name}`}
                      onClick={() => handleDelete(deck.id, deck.name)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              </li>
            )
          })}
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
