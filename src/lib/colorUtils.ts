export const DEFAULT_DECK_COLOR = '#1faf7f'

export const DECK_COLOR_SWATCHES = [
  { name: 'Green', value: '#1faf7f' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Mustard', value: '#E3B505' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
] as const

export function normalizeHexColor(hex?: string | null): string {
  if (!hex) return DEFAULT_DECK_COLOR
  const cleaned = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return DEFAULT_DECK_COLOR
  }
  return `#${cleaned}`
}

export function getContrastYIQ(hexcolor: string): 'text-black' | 'text-white' {
  hexcolor = hexcolor.replace('#', '')
  if (hexcolor.length === 3) {
    hexcolor = hexcolor
      .split('')
      .map((char) => char + char)
      .join('')
  }
  const r = parseInt(hexcolor.substring(0, 2), 16)
  const g = parseInt(hexcolor.substring(2, 4), 16)
  const b = parseInt(hexcolor.substring(4, 6), 16)

  const yiq = (r * 299 + g * 587 + b * 114) / 1000

  return yiq >= 128 ? 'text-black' : 'text-white'
}

/** Solid ink for text on a deck swatch (beats global heading color rules). */
export function getContrastInk(hexcolor: string): '#111111' | '#ffffff' {
  return getContrastYIQ(hexcolor) === 'text-black' ? '#111111' : '#ffffff'
}
