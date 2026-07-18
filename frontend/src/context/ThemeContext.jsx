import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function getStoredTheme() {
  const stored = localStorage.getItem('lp_theme')
  return stored === 'light' || stored === 'dark' ? stored : null
}

function applyTheme(theme) {
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => getStoredTheme() || (systemPrefersDark() ? 'dark' : 'light'))

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    localStorage.setItem('lp_theme', next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
