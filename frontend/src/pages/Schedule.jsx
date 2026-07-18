import { CalendarClock, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

const statusTint = {
  pending: 'lp-tag',
  confirmed: 'lp-tag lp-tag--accent2',
  completed: 'lp-tag',
  cancelled: 'lp-tag lp-tag--accent',
}

export default function Schedule() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [partners, setPartners] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    partner_id: searchParams.get('partner') || '',
    scheduled_time: '',
    duration_minutes: 30,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadSessions = () => client.get('/sessions/').then(({ data }) => setSessions(data))

  useEffect(() => {
    Promise.all([client.get('/matching/partners/'), loadSessions()])
      .then(([p]) => setPartners(p.data))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.partner_id || !form.scheduled_time) {
      setError(t('schedule.errorMissing'))
      return
    }
    setSubmitting(true)
    try {
      await client.post('/sessions/', {
        ...form,
        scheduled_time: new Date(form.scheduled_time).toISOString(),
      })
      await loadSessions()
      setForm({ ...form, notes: '' })
    } catch {
      setError(t('schedule.errorFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id, status) => {
    await client.patch(`/sessions/${id}/status/`, { status })
    loadSessions()
  }

  const inputClass = 'w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
  const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight mb-6" style={{ color: 'var(--ink)' }}>{t('schedule.title')}</h1>

        <form onSubmit={handleSubmit} className="lp-card space-y-4 mb-10">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('schedule.partner')}</label>
              <select
                value={form.partner_id}
                onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                className={inputClass}
                style={inputStyle}
              >
                <option value="">{t('schedule.selectAPartner')}</option>
                {partners.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('schedule.dateTime')}</label>
              <input
                type="datetime-local"
                value={form.scheduled_time}
                onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('schedule.duration')}</label>
            <input
              type="number"
              min={15}
              step={15}
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              className={`${inputClass} w-32`}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('schedule.notes')}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
          <button type="submit" disabled={submitting} className="lp-btn-primary disabled:opacity-50">
            {submitting ? t('schedule.submitting') : t('schedule.submit')}
          </button>
        </form>

        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>{t('schedule.yourSessions')}</h2>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('schedule.loading')}</p>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 rounded-2xl" style={{ border: '1px dashed var(--line)' }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full mb-3" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
              <CalendarClock size={18} />
            </div>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('schedule.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const isHost = s.host.id === user.id
              const other = isHost ? s.partner : s.host
              return (
                <div key={s.id} className="lp-card flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <img src={avatarUrl(other.id, 70)} alt="" className="h-11 w-11 rounded-full object-cover" />
                    <div>
                      <p className="font-medium" style={{ color: 'var(--ink)' }}>
                        {new Date(s.scheduled_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        {' · '}{t('schedule.minutesShort', { count: s.duration_minutes })}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                        {t('schedule.withPartner', { name: other.full_name })}{' '}
                        <span className={`ms-1 ${statusTint[s.status]}`}>{t(`schedule.status.${s.status}`)}</span>
                      </p>
                      {s.notes && <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{s.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isHost && s.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(s.id, 'confirmed')}
                        className="text-sm px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                        style={{ background: 'var(--surface-2)', color: 'var(--accent-2)' }}
                      >
                        {t('schedule.confirm')}
                      </button>
                    )}
                    {s.status !== 'cancelled' && s.status !== 'completed' && (
                      <button
                        onClick={() => updateStatus(s.id, 'cancelled')}
                        className="text-sm px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                        style={{ background: 'var(--surface-2)', color: '#c1443d' }}
                      >
                        {t('schedule.cancelSession')}
                      </button>
                    )}
                    {s.status === 'confirmed' && (
                      <Link to={`/call/${s.room_id}`} className="lp-btn-primary text-sm px-3 py-1.5">
                        <Video size={14} /> {t('schedule.joinCall')}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
