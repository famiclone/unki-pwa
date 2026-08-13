import { useState } from 'react'
import {
  Check,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import {
  assignCardToDeck,
  createDeck,
  type Card,
  type Deck,
  type Review,
} from '@/db'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { getSrsProgress } from '@/lib/srsProgress'
import { SrsBattery } from '@/components/SrsBattery'
import { SpeakButton } from '@/components/SpeakButton'
import {
  DeckFormDialog,
  type DeckFormData,
} from '@/components/DeckFormDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type CardRowProps = {
  card: Card
  review: Review | null
  decks: Deck[]
  deckColor?: string
  onEdit: (card: Card) => void
  onReset: (card: Card) => void
  onDelete: (card: Card) => void
  onAssigned?: (card: Card, deck: Deck) => void
}

export function CardRow({
  card,
  review,
  decks,
  deckColor,
  onEdit,
  onReset,
  onDelete,
  onAssigned,
}: CardRowProps) {
  const imageUrl = useObjectUrl(card.image)
  const progress = getSrsProgress(review)
  const [deckDialogOpen, setDeckDialogOpen] = useState(false)

  async function handleAssign(deck: Deck) {
    if (card.deckId === deck.id) return
    const updated = await assignCardToDeck(card.id, deck.id)
    onAssigned?.(updated, deck)
  }

  async function handleCreateAndAssign(deckData: DeckFormData) {
    const deck = await createDeck({
      name: deckData.name,
      description: deckData.description,
      image: deckData.image,
      color: deckData.color,
    })
    const updated = await assignCardToDeck(card.id, deck.id)
    onAssigned?.(updated, deck)
  }

  return (
    <li
      className="flex items-center gap-3 rounded-xl border border-border border-r-[3px] bg-card p-3 text-card-foreground"
      style={{ borderRightColor: deckColor || undefined }}
    >
      <SrsBattery progress={progress} />

      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="size-14 shrink-0 rounded-lg object-cover bg-muted"
        />
      ) : (
        <div
          className="size-14 shrink-0 rounded-lg border border-dashed border-border bg-muted/60"
          aria-hidden
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate font-[family-name:var(--font-display)] text-lg font-semibold leading-tight">
            {card.front}
          </p>
          <SpeakButton text={card.front} label={`Pronounce ${card.front}`} />
        </div>
        {card.romaji ? (
          <p className="truncate text-sm italic text-muted-foreground">{card.romaji}</p>
        ) : null}
        <p className="truncate text-sm text-foreground/90">{card.back}</p>
        {card.example ? (
          <div className="mt-0.5 flex items-start gap-0.5">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {card.example}
            </p>
            <SpeakButton
              text={card.example}
              label="Pronounce example"
              className="size-7"
            />
          </div>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Card actions"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(card)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput />
              Assign to Deck
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              <DropdownMenuItem
                onSelect={() => {
                  requestAnimationFrame(() => setDeckDialogOpen(true))
                }}
              >
                <Plus />
                Create New Deck...
              </DropdownMenuItem>
              {decks.length > 0 ? <DropdownMenuSeparator /> : null}
              {decks.map((deck) => (
                <DropdownMenuItem
                  key={deck.id}
                  onSelect={() => void handleAssign(deck)}
                >
                  {card.deckId === deck.id ? <Check /> : <span className="size-4" />}
                  <span className="truncate">{deck.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => onReset(card)}>
            <RotateCcw />
            Reset
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete(card)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeckFormDialog
        isOpen={deckDialogOpen}
        onClose={() => setDeckDialogOpen(false)}
        onSave={handleCreateAndAssign}
      />
    </li>
  )
}
