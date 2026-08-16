import { useMemo, useState } from 'react'
import { Reorder } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Tile = { id: string; char: string }

function toTiles(text: string): Tile[] {
  return Array.from(text).map((char, index) => ({
    id: `${index}:${char}`,
    char,
  }))
}

function shuffleTiles(tiles: Tile[]): Tile[] {
  const next = [...tiles]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  return next
}

function shuffledAwayFromOriginal(tiles: Tile[]): Tile[] {
  if (tiles.length <= 1) return [...tiles]
  const original = tiles.map((tile) => tile.char).join('')
  let next = shuffleTiles(tiles)
  for (
    let attempt = 0;
    attempt < 8 && next.map((tile) => tile.char).join('') === original;
    attempt += 1
  ) {
    next = shuffleTiles(tiles)
  }
  return next
}

type ScrambleChallengeProps = {
  expected: string
  disabled?: boolean
  onComplete: (isSuccess: boolean) => void
}

export function ScrambleChallenge({
  expected,
  disabled = false,
  onComplete,
}: ScrambleChallengeProps) {
  const seed = useMemo(() => toTiles(expected), [expected])
  const [tiles, setTiles] = useState(() => shuffledAwayFromOriginal(seed))

  function checkAnswer() {
    if (disabled) return
    onComplete(tiles.map((tile) => tile.char).join('') === expected)
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="m-0 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Drag letters into order
      </p>
      <Reorder.Group
        axis="x"
        values={tiles}
        onReorder={setTiles}
        className="m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0"
        as="ul"
      >
        {tiles.map((tile) => (
          <Reorder.Item
            key={tile.id}
            value={tile}
            dragListener={!disabled}
            className={cn(
              'flex size-10 shrink-0 cursor-grab list-none items-center justify-center rounded-lg border border-border bg-card text-lg font-semibold shadow-sm active:cursor-grabbing',
              tile.char === ' ' && 'border-dashed text-muted-foreground',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            {tile.char === ' ' ? '␣' : tile.char}
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <Button
        type="button"
        className="h-12 w-full"
        disabled={disabled}
        onClick={checkAnswer}
      >
        Check Answer
      </Button>
    </div>
  )
}
