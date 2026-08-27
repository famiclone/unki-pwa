import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { speakText } from '@/lib/speech'
import { cn } from '@/lib/utils'

type SpeakButtonProps = {
  text: string
  lang?: string
  label?: string
  className?: string
}

export function SpeakButton({
  text,
  lang,
  label = 'Pronounce',
  className,
}: SpeakButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('text-muted-foreground hover:text-foreground', className)}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation()
        speakText(text, lang)
      }}
    >
      <Volume2 />
    </Button>
  )
}
