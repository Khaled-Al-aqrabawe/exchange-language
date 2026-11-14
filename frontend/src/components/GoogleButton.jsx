import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    const script = existing || Object.assign(document.createElement('script'), { src: SCRIPT_SRC, async: true })
    script.addEventListener('load', resolve, { once: true })
    script.addEventListener('error', reject, { once: true })
    if (!existing) document.head.appendChild(script)
  })
}

// "Continue with Google" button (Google Identity Services). Renders nothing until
// VITE_GOOGLE_CLIENT_ID is set.
export default function GoogleButton({ onError }) {
  const { t, i18n } = useTranslation()
  const { googleLogin } = useAuth()
  const navigate = useNavigate()
  const holder = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID) return undefined
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !holder.current) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            try {
              await googleLogin(credential)
              navigate('/home')
            } catch {
              onError?.(t('auth.google.error', 'Could not sign in with Google.'))
            }
          },
        })
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: holder.current.offsetWidth || 360,
          locale: i18n.resolvedLanguage,
        })
      })
      .catch(() => setFailed(true))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.resolvedLanguage])

  // While developing, show that the button exists but is not set up yet.
  if (!CLIENT_ID && import.meta.env.DEV) {
    return (
      <div className="mt-5">
        <div className="mb-4 flex items-center gap-3 text-xs" style={{ color: 'var(--ink-faint)' }}>
          <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
          {t('auth.google.or', 'or')}
          <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
        </div>
        <button type="button" disabled className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 text-sm font-medium opacity-60" style={{ background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-control)', color: 'var(--ink)' }}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.7 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.3 5.7c4.3-4 6.8-9.9 6.8-17.2z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.3 0-11.7-4-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          {t('auth.google.continue', 'Continue with Google')}
        </button>
        <p className="mt-2 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>Dev note: add VITE_GOOGLE_CLIENT_ID to frontend/.env to enable.</p>
      </div>
    )
  }

  if (!CLIENT_ID || failed) return null

  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3 text-xs" style={{ color: 'var(--ink-faint)' }}>
        <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
        {t('auth.google.or', 'or')}
        <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
      </div>
      <div ref={holder} className="flex min-h-[44px] w-full justify-center" />
    </div>
  )
}
