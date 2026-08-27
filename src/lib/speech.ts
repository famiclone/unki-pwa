/** Skip TTS for long answers (definitions, example paragraphs). */
export const MAX_AUTO_SPEAK_CHARS = 100

/** Gap after cancel() so Chrome/Safari re-bind voice/lang on the next speak. */
const SPEAK_AFTER_CANCEL_MS = 60

const CREEPY_VOICE =
  /bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|pipes|trinoids|whisper|zarvox|albert|ralph|junior|kathy|princess|belinda|compact|novelty|dummy|eloquence/i

const PREFERRED_JA =
  /google 日本語|kyoko|o-?ren|nanami|siri.*ja|microsoft haruka|microsoft ichiro/i

const PREFERRED_EN =
  /samantha|google us english|karen|moira|tessa|aria|jenny|siri|microsoft zira|microsoft guy/i

const PREFERRED_UK =
  /lesya|google.*україн|google.*ukrain|microsoft ostap|microsoft polina|siri.*uk/i

let voicesReady = false
let currentUtterance: SpeechSynthesisUtterance | null = null
let speakTimer: ReturnType<typeof setTimeout> | null = null
/** Remember chosen voice name per language prefix (objects go stale across calls). */
const preferredVoiceName = new Map<string, string>()

/** Prefer ja for kana/kanji, uk for Cyrillic, else en. */
export function detectSpeechLang(text: string): string {
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(text)) return 'ja-JP'
  // Cyrillic (Ukrainian + related scripts) → Ukrainian voice.
  if (/[\u0400-\u052F]/.test(text)) return 'uk-UA'
  return 'en-US'
}

export function cancelSpeech(): void {
  if (typeof window === 'undefined') return
  if (speakTimer !== null) {
    clearTimeout(speakTimer)
    speakTimer = null
  }
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  currentUtterance = null
}

function langPrefix(lang: string): string {
  return lang.slice(0, 2).toLowerCase()
}

function scoreVoice(voice: SpeechSynthesisVoice, lang: string): number {
  const prefix = langPrefix(lang)
  const voiceLang = voice.lang.replace('_', '-').toLowerCase()
  if (!voiceLang.startsWith(prefix)) return -1
  if (CREEPY_VOICE.test(voice.name)) return -1

  let score = 10
  if (voiceLang.toLowerCase() === lang.toLowerCase()) score += 20
  if (/enhanced|premium|neural|natural|online \(natural\)|siri|wavenet|studio/.test(voice.name)) {
    score += 40
  }
  if (prefix === 'ja' && PREFERRED_JA.test(voice.name)) score += 30
  if (prefix === 'en' && PREFERRED_EN.test(voice.name)) score += 30
  if (prefix === 'uk' && PREFERRED_UK.test(voice.name)) score += 30
  if (/google/.test(voice.name)) score += 16
  if (
    /female|woman|girl|kyoko|o-?ren|nanami|samantha|karen|aria|jenny|lesya|polina/.test(
      voice.name,
    )
  ) {
    score += 12
  }
  if (voice.localService) score += 6
  if (voice.default) score += 2
  return score
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return undefined

  const prefix = langPrefix(lang)
  const cachedName = preferredVoiceName.get(prefix)
  if (cachedName) {
    const cached = voices.find((voice) => voice.name === cachedName)
    if (cached && scoreVoice(cached, lang) > 0) return cached
  }

  let best: SpeechSynthesisVoice | undefined
  let bestScore = -1
  for (const voice of voices) {
    const score = scoreVoice(voice, lang)
    if (score > bestScore) {
      best = voice
      bestScore = score
    }
  }
  if (best && bestScore > 0) {
    preferredVoiceName.set(prefix, best.name)
    return best
  }
  return undefined
}

function warmVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis || voicesReady) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    voicesReady = true
    return
  }
  window.speechSynthesis.addEventListener(
    'voiceschanged',
    () => {
      voicesReady = window.speechSynthesis.getVoices().length > 0
    },
    { once: true },
  )
}

if (typeof window !== 'undefined') {
  warmVoices()
}

/** Pronounce text with the browser Web Speech API. */
export function speakText(text: string, lang?: string): void {
  const value = text.trim()
  if (!value || typeof window === 'undefined' || !window.speechSynthesis) {
    return
  }

  warmVoices()
  cancelSpeech()

  const resolvedLang = lang ?? detectSpeechLang(value)

  // Defer speak: same-tick cancel()+speak() often keeps the previous voice
  // (e.g. EN after UK) on Chrome/Safari — broken after the first match tap.
  speakTimer = setTimeout(() => {
    speakTimer = null

    const utterance = new SpeechSynthesisUtterance(value)
    const prefix = langPrefix(resolvedLang)
    utterance.lang = resolvedLang
    utterance.rate = prefix === 'ja' ? 0.92 : prefix === 'uk' ? 0.95 : 1
    // Neutral pitch for uk — some engines ignore voice when pitch ≠ 1.
    utterance.pitch = prefix === 'uk' ? 1 : 1.12
    utterance.volume = 1

    const voice = pickVoice(resolvedLang)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }

    currentUtterance = utterance
    utterance.onend = () => {
      if (currentUtterance === utterance) currentUtterance = null
    }
    utterance.onerror = () => {
      if (currentUtterance === utterance) currentUtterance = null
    }

    try {
      window.speechSynthesis.resume()
    } catch {
      // ignore
    }
    window.speechSynthesis.speak(utterance)
  }, SPEAK_AFTER_CANCEL_MS)
}

/** Speak a short prompt on card flip; ignore empty or long text. */
export function speakIfShort(
  text: string,
  lang?: string,
  maxChars = MAX_AUTO_SPEAK_CHARS,
): void {
  const value = text.trim()
  if (!value || value.length > maxChars) return
  speakText(value, lang)
}
