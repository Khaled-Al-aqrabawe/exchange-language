import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'

const HEARTBEAT_MS = 60_000

// Header switch for "Available now". Defaults to ON whenever the site is opened and
// keeps pinging the server while open so a closed tab expires on its own.
export default function PresenceToggle() {
  const { t } = useTranslation()
  const [available, setAvailable] = useState(true)
  const availableRef = useRef(true)

  const send = (value) => client.post('/auth/me/presence/', { available: value }).catch(() => {})

  useEffect(() => {
    send(true)
    const id = setInterval(() => send(availableRef.current), HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [])

  const toggle = () => {
    const next = !available
    availableRef.current = next
    setAvailable(next)
    send(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={available}
      title={available ? t('presence.on') : t('presence.off')}
      className="inline-flex items-center gap-2 rounded-full ps-2.5 pe-1.5 py-1 text-xs font-semibold transition-colors"
      style={{
        border: '1px solid var(--line)',
        background: available ? 'color-mix(in srgb, var(--accent-2) 12%, var(--surface))' : 'var(--surface)',
        color: available ? 'var(--accent-2)' : 'var(--ink-soft)',
      }}
    >
      <span className="hidden md:inline">{available ? t('presence.on') : t('presence.off')}</span>
      <span
        className="relative h-4 w-7 rounded-full transition-colors"
        style={{ background: available ? 'var(--accent-2)' : 'var(--line)' }}
      >
        <span
          className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
          style={{ insetInlineStart: available ? '14px' : '2px' }}
        />
      </span>
    </button>
  )
}
