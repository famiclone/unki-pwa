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
import type { Card } from '@/db'

export type CardFormValues = {
  front: string
  romaji: string
  back: string
  example: string
  imageFile: File | null
  clearImage: boolean
}

type CardFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  card?: Card | null
  saving?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CardFormValues) => Promise<void> | void
}

async function fileToBlob(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  return new Blob([buffer], { type: file.type || 'application/octet-stream' })
}

export { fileToBlob }

export function CardFormDialog({
  open,
  mode,
  card,
  saving = false,
  onOpenChange,
  onSubmit,
}: CardFormDialogProps) {
  const [front, setFront] = useState('')
  const [romaji, setRomaji] = useState('')
  const [back, setBack] = useState('')
  const [example, setExample] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [clearImage, setClearImage] = useState(false)
  const [fileKey, setFileKey] = useState(0)

  useEffect(() => {
    if (!open) return
    setFront(card?.front ?? '')
    setRomaji(card?.romaji ?? '')
    setBack(card?.back ?? '')
    setExample(card?.example ?? '')
    setImageFile(null)
    setClearImage(false)
    setFileKey((k) => k + 1)
  }, [open, card])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!front.trim() || !back.trim() || saving) return
    await onSubmit({
      front,
      romaji,
      back,
      example,
      imageFile,
      clearImage,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add card' : 'Edit card'}</DialogTitle>
          <DialogDescription>
            Front is the vocabulary; back is the translation. Example sentence is
            optional.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="card-front">Front</Label>
            <Input
              id="card-front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Vocabulary (e.g. 食べる)"
              required
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="card-romaji">Romaji (optional)</Label>
            <Input
              id="card-romaji"
              value={romaji}
              onChange={(e) => setRomaji(e.target.value)}
              placeholder="Pronunciation (e.g. taberu)"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="card-back">Back</Label>
            <Input
              id="card-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Translation (e.g. to eat)"
              required
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="card-example">Example sentence (optional)</Label>
            <Input
              id="card-example"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="例文 / example sentence"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="card-image">Image (optional)</Label>
            <Input
              key={fileKey}
              id="card-image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] ?? null)
                setClearImage(false)
              }}
            />
            {mode === 'edit' && card?.image && !clearImage ? (
              <button
                type="button"
                className="justify-self-start text-left text-xs text-muted-foreground underline"
                onClick={() => {
                  setClearImage(true)
                  setImageFile(null)
                  setFileKey((k) => k + 1)
                }}
              >
                Remove current image
              </button>
            ) : null}
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !front.trim() || !back.trim()}>
              {saving ? 'Saving…' : mode === 'create' ? 'Add card' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
