import { Bell, CalendarCheck, CalendarClock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'

const POLL_INTERVAL_MS = 30000

export default function NotificationBell() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const ref = useRef(null)

  const load = useCallback(() => {
    client.get('/sessions/notifications/')
      .then(({ data }) => {
        setItems(data.items)
        setUnreadCount(data.unread_count)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next && unreadCount > 0) {
      client.post('/sessions/notifications/seen/').then(() => {
        setUnreadCount(0)
        setItems((prev) => prev.map((item) => ({ ...item, is_new: false })))
      })
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        title={t('notifications.title')}
        aria-label={t('notifications.title')}
        className="relative flex h-9 w-9 items-center justify-center transition-colors hover:opacity-70"
        style={{ borderRadius: 'var(--radius-tag)', color: 'var(--ink-soft)' }}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 end-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
            style={{ background: '#c1443d', color: '#fff' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute end-0 top-full mt-2 w-80 max-h-96 overflow-y-auto py-1.5 lp-surface"
          style={{ boxShadow: '0 12px 30px -12px rgb(0 0 0 / 0.25)' }}
        >
          <div className="px-3.5 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t('notifications.title')}</p>
          </div>

          {loading ? (
            <p className="px-3.5 py-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('common.loading')}</p>
          ) : items.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('notifications.empty')}</p>
          ) : (
            items.map((item) => {
              const session = item.session
              const otherName = item.type === 'request' ? session.host.full_name : session.partner.full_name
              const date = new Date(session.scheduled_time)
              const Icon = item.type === 'request' ? CalendarClock : CalendarCheck
              return (
                <Link
                  key={`${item.type}-${session.id}`}
                  to="/schedule"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 hover:opacity-80"
                  style={{ background: item.is_new ? 'var(--surface-2)' : 'transparent' }}
                >
                  <Icon size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>
                      {item.type === 'request'
                        ? t('notifications.request', { name: otherName })
                        : t('notifications.confirmed', { name: otherName })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                      {date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  {item.is_new && (
                    <span className="ms-auto mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} />
                  )}
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
