/** Pronounce text with the browser Web Speech API. */
export function speakText(text: string, lang = 'ja-JP'): void {
  const value = text.trim()
  if (!value || typeof window === 'undefined' || !window.speechSynthesis) {
    return
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(value)
  utterance.lang = lang
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}
