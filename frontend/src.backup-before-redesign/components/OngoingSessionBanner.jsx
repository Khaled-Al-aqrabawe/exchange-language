import { Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const POLL_MS = 30000

// If someone closed the site in the middle of a session, this brings them back to it:
// a session they already joined, still approved and not yet over.
export default function OngoingSessionBanner() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (!user) return undefined
    const check = () => client.get('/sessions/').then(({ data }) => {
      const now = Date.now()
      setSession(data.find((s) => {
        const start = new Date(s.scheduled_time).getTime()
        return s.status === 'confirmed' && s.my_joined && start <= now && now < start + s.duration_minutes * 60000
      }) || null)
    }).catch(() => {})
    check()
    const id = setInterval(check, POLL_MS)
    return () => clearInterval(id)
  }, [user, location.pathname])

  if (!session || location.pathname.startsWith('/call/')) return null
  const other = session.host.id === user.id ? session.partner : session.host

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
      <Video size={16} />
      <span>{t('schedule.ongoingSession', { name: other.full_name })}</span>
      <Link to={`/call/${session.room_id}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold" style={{ color: 'var(--accent)' }}>
        {t('schedule.returnToSession')}
      </Link>
    </div>
  )
}
