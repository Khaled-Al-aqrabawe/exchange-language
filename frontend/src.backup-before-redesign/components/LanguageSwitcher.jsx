import { Check, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { LANGUAGE_OPTIONS } from '../i18n/config'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = LANGUAGE_OPTIONS.find((l) => l.code === i18n.resolvedLanguage) || LANGUAGE_OPTIONS[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={t('language.choose')}
        aria-label={t('language.choose')}
        className="flex h-9 w-9 items-center justify-center transition-colors hover:opacity-70"
        style={{ borderRadius: 'var(--radius-tag)', color: 'var(--ink-soft)' }}
      >
        <Globe size={17} />
      </button>

      {open && (
        <div
          className="absolute end-0 top-full mt-2 w-48 py-1.5 lp-surface"
          style={{ boxShadow: '0 12px 30px -12px rgb(0 0 0 / 0.25)' }}
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                i18n.changeLanguage(lang.code)
                setOpen(false)
                if (user) {
                  client.patch('/auth/me/', { profile: { ui_language: lang.code } }).catch(() => {})
                }
              }}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-sm hover:opacity-70"
              style={{ color: lang.code === current.code ? 'var(--accent)' : 'var(--ink)' }}
            >
              <span>{lang.nativeLabel}</span>
              {lang.code === current.code && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
