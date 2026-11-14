import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      title={t(isDark ? 'theme.toggleToLight' : 'theme.toggleToDark')}
      aria-label={t(isDark ? 'theme.toggleToLight' : 'theme.toggleToDark')}
      className="lp-social-icon flex h-9 w-9 items-center justify-center"
      style={{ borderRadius: 'var(--radius-tag)', border: '1px solid transparent', color: 'var(--ink-soft)' }}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
