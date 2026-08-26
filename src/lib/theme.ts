export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'unki-theme'

/** Matches `--bg-color` in index.css — used for mobile browser chrome. */
export const THEME_BG: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#0d1117',
}

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme()
}

function syncThemeColorMeta(theme: Theme): void {
  const color = THEME_BG[theme]
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', color)
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  syncThemeColorMeta(theme)
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Ignore quota / private-mode failures.
  }
  applyTheme(theme)
}

export function toggleThemeValue(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}
