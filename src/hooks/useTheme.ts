import { useEffect, useState } from 'react'
import {
  applyTheme,
  persistTheme,
  resolveTheme,
  toggleThemeValue,
  type Theme,
} from '@/lib/theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(next: Theme) {
    persistTheme(next)
    setThemeState(next)
  }

  function toggleTheme() {
    setTheme(toggleThemeValue(theme))
  }

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' }
}
