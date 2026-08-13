import { type FormEvent, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import type { Deck } from '@/db'

export type DeckFormData = {
  name: string
  description?: string
  /** New cover image, or `null` to clear an existing image. */
  image?: Blob | null
}

type DeckFormDialogProps = {
  isOpen: boolean
  onClose: () => void
  deck?: Deck | null
  onSave: (deckData: DeckFormData) => Promise<void> | void
}

async function fileToBlob(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  return new Blob([buffer], { type: file.type || 'application/octet-stream' })
}

export function DeckFormDialog({
  isOpen,
  onClose,
  deck,
  onSave,
}: DeckFormDialogProps) {
  const isEditing = Boolean(deck)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [clearImage, setClearImage] = useState(false)
  const [fileKey, setFileKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewBlob = imageFile ?? (!clearImage ? deck?.image : undefined)
  const previewUrl = useObjectUrl(previewBlob)

  useEffect(() => {
    if (!isOpen) return
    setName(deck?.name ?? '')
    setDescription(deck?.description ?? '')
    setImageFile(null)
    setClearImage(false)
    setFileKey((key) => key + 1)
    setSaving(false)
    setError(null)
  }, [isOpen, deck])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || saving) return

    setSaving(true)
    setError(null)
    try {
      const deckData: DeckFormData = {
        name: name.trim(),
        description: description.trim() || undefined,
      }

      if (imageFile) {
        deckData.image = await fileToBlob(imageFile)
      } else if (clearImage) {
        deckData.image = null
      }

      await onSave(deckData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save deck.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit deck' : 'New deck'}</DialogTitle>
          <DialogDescription>
            Name is required. Description and cover image are optional.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-1.5">
            <Label htmlFor="deck-name">Name</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Genki Lesson 1"
              required
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="deck-description">Description</Label>
            <Textarea
              id="deck-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this deck is for"
              rows={3}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="deck-image">Image</Label>
            <input
              key={fileKey}
              id="deck-image"
              type="file"
              accept="image/*"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] ?? null)
                setClearImage(false)
              }}
            />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="mt-1 h-24 w-full rounded-md object-cover bg-muted"
              />
            ) : null}
            {isEditing && deck?.image && !clearImage ? (
              <button
                type="button"
                className="justify-self-start text-left text-xs text-muted-foreground underline"
                onClick={() => {
                  setClearImage(true)
                  setImageFile(null)
                  setFileKey((key) => key + 1)
                }}
              >
                Remove current image
              </button>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : isEditing ? 'Save' : 'Create deck'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
