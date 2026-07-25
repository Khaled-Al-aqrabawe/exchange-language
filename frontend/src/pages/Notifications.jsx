import { AlarmClock, Bell, CalendarCheck, CalendarClock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const ICONS = { request: CalendarClock, confirmed: CalendarCheck, reminder: AlarmClock }
const TINT = {
  request: { bg: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' },
  confirmed: { bg: 'color-mix(in srgb, var(--accent-2) 16%, transparent)', color: 'var(--accent-2)' },
  reminder: { bg: 'color-mix(in srgb, #c98a1c 16%, transparent)', color: '#c98a1c' },
}

export default function Notifications() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/sessions/notifications/', { params: { all: 1 } })
      .then(({ data }) => setItems(data.items))
      .finally(() => setLoading(false))
    client.post('/sessions/notifications/seen/').catch(() => {})
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-6 lp-animate-in">
          <div className="lp-icon-badge mb-3">
            <Bell size={18} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--ink)' }}>{t('notifications.pageTitle')}</h1>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('notifications.pageSubtitle')}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-14">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <div className="lp-card text-center py-14">
            <Bell size={26} className="mx-auto mb-3" style={{ color: 'var(--ink-soft)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('notifications.empty')}</p>
          </div>
        ) : (
          <div className="lp-card divide-y" style={{ borderColor: 'var(--line)' }}>
            {items.map((item, idx) => {
              const session = item.session
              const otherName = session.host.id === user?.id ? session.partner.full_name : session.host.full_name
              const date = new Date(session.scheduled_time)
              const Icon = ICONS[item.type]
              const tint = TINT[item.type]
              return (
                <Link
                  key={`${item.type}-${session.id}-${idx}`}
                  to="/schedule"
                  className="flex items-start gap-3.5 px-5 py-4 hover:opacity-80 transition-opacity"
                  style={{ background: item.is_new ? 'var(--surface-2)' : 'transparent', borderColor: 'var(--line)' }}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: tint.bg, color: tint.color }}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {t(`notifications.${item.type}`, { name: otherName })}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                      {date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  {item.is_new && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} />
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
