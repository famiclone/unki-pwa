/** Study SFX under `public/assets/sfx/` (BASE_URL-safe for GitHub Pages). */

function sfxUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}assets/sfx/${file}`
}

const CORRECT_URL = sfxUrl('correct.mp3')
const MISTAKE_URL = sfxUrl('mistake.mp3')

function playUrl(url: string): void {
  if (typeof window === 'undefined') return
  try {
    const audio = new Audio(url)
    audio.volume = 0.85
    void audio.play().catch(() => {
      // Autoplay may be blocked until a user gesture; study taps count as gestures.
    })
  } catch {
    // Ignore missing Audio / decode errors.
  }
}

/** Positive grade / challenge success. */
export function playCorrectSfx(): void {
  playUrl(CORRECT_URL)
}

/** Study again / challenge failure. */
export function playMistakeSfx(): void {
  playUrl(MISTAKE_URL)
}
