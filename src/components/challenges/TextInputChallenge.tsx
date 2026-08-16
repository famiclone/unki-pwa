import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function answersMatch(input: string, expected: string): boolean {
  return input.trim().toLowerCase() === expected.trim().toLowerCase()
}

type TextInputChallengeProps = {
  expected: string
  disabled?: boolean
  onComplete: (isSuccess: boolean) => void
}

export function TextInputChallenge({
  expected,
  disabled = false,
  onComplete,
}: TextInputChallengeProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function submit() {
    if (disabled) return
    onComplete(answersMatch(value, expected))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className="flex w-full flex-col gap-3" onSubmit={handleSubmit}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type the answer…"
        className="h-14 text-center text-lg"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={disabled}
        aria-label="Challenge answer"
      />
      <Button type="submit" className="h-12 w-full" disabled={disabled || !value.trim()}>
        Submit
      </Button>
    </form>
  )
}
