import { BookOpen, MessagesSquare, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { resolveAvatarUrl } from '../utils/images'

const POLL_MS = 8000

// The small groups people can join right now (at most 4 seats each).
// mode 'soon': only groups running now or starting within 5 minutes (shown under Available now).
// mode 'all': every upcoming group (the Small groups tab).
export default function SmallGroups({ refreshKey = 0, mode = 'all', onCount }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = () => client.get('/calls/groups/').then(({ data }) => { setGroups(data); onCount?.(data.length) }).catch(() => {})

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [refreshKey])

  const reserve = async (g) => {
    setBusy(g.room_id)
    setError('')
    try {
      await client.post(`/calls/groups/${g.room_id}/join/`)
    } catch (err) {
      setError(err.response?.data?.detail || t('group.joinError', 'Could not join the group.'))
    }
    await load()
    setBusy('')
  }

  const giveUp = async (g) => {
    setBusy(g.room_id)
    await client.post(`/calls/groups/${g.room_id}/leave/`).catch(() => {})
    await load()
    setBusy('')
  }

  const SOON_MS = 5 * 60 * 1000
  const shownGroups = mode === 'soon'
    ? groups.filter((g) => new Date(g.scheduled_time).getTime() - Date.now() <= SOON_MS)
    : groups

  if (shownGroups.length === 0) {
    return mode === 'soon' ? null : (
      <div className="lp-card lp-animate-in mx-auto max-w-xl py-14 text-center">
        <span className="lp-icon-badge mx-auto mb-4 h-14 w-14"><Users size={22} /></span>
        <p className="mx-auto max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>{t('group.none', 'No small groups are scheduled yet. Create one!')}</p>
      </div>
    )
  }

  return (
    <section className="mb-10 lp-animate-in">
      {mode === 'soon' && (
        <h2 className="lp-serif mb-4 flex items-center gap-2 text-2xl">
          <Users size={22} style={{ color: 'var(--accent)' }} /> {t('group.startingSoon', 'Small groups starting now')}
        </h2>
      )}
      {error && <p className="mb-3 text-sm" style={{ color: '#c1443d' }}>{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shownGroups.map((g, i) => {
          const full = g.seats_taken >= g.max_members
          const when = new Date(g.scheduled_time)
          return (
            <div key={g.room_id} className="flex flex-col p-5" style={{ background: ['#ede9fe', '#FFF1F2', '#f4d9cf'][i % 3], color: '#17191d', borderRadius: 'var(--radius-card)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgb(255 255 255 / 0.7)' }}>
                  {g.session_type === 'conversation' ? <MessagesSquare size={13} /> : <BookOpen size={13} />}
                  {g.session_type === 'conversation'
                    ? t('partners.typeConversation', 'Free conversation')
                    : `${t('partners.typeLesson', 'From the lessons')}${g.lesson ? ` · ${t('partners.lessonOption', { n: g.lesson })}` : ''}`}
                </span>
                <span className="text-sm font-semibold">{g.seats_taken}/{g.max_members}</span>
              </div>
              <p className="lp-serif mt-3 text-lg">
                {when.toLocaleString(i18n.resolvedLanguage, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
              <p className="mt-0.5 truncate text-sm" style={{ opacity: 0.75 }}>
                {t('group.hostedBy', 'Hosted by {{name}}', { name: g.host.name })}
                {g.language ? ` · ${[g.language, g.level].filter(Boolean).join(' ')}` : ''}
              </p>
              <div className="mt-3 flex -space-x-2 rtl:space-x-reverse">
                {g.members.map((m) => (
                  <img key={m.id} src={resolveAvatarUrl(m.avatar, m.id, 64)} alt={m.name} title={m.name} className="lp-avatar h-9 w-9 object-cover" style={{ border: '2px solid #fff' }} />
                ))}
              </div>
              {g.is_member ? (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/group/${g.room_id}`)}
                    className="inline-flex h-11 flex-1 items-center justify-center text-sm font-semibold"
                    style={{ background: '#1E293B', color: '#fff', borderRadius: 'var(--radius-pill)' }}
                  >
                    {g.can_enter ? t('group.enter', 'Enter group') : t('group.reserved', 'Seat reserved')}
                  </button>
                  <button
                    type="button"
                    onClick={() => giveUp(g)}
                    disabled={busy === g.room_id}
                    className="inline-flex h-11 items-center justify-center px-4 text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'rgb(255 255 255 / 0.7)', borderRadius: 'var(--radius-pill)' }}
                  >
                    {g.is_host ? t('group.cancelGroup', 'Cancel group') : t('group.giveUp', 'Give up seat')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => reserve(g)}
                  disabled={full || busy === g.room_id}
                  className="mt-4 inline-flex h-11 items-center justify-center text-sm font-semibold disabled:opacity-50"
                  style={{ background: '#1E293B', color: '#fff', borderRadius: 'var(--radius-pill)' }}
                >
                  {full ? t('group.full', 'Full') : t('group.reserve', 'Reserve a seat')}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
