import { CalendarClock, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import { LANGUAGES, LEVELS } from '../constants'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

const statusTint = {
  pending: 'lp-tag',
  confirmed: 'lp-tag lp-tag--accent2',
  completed: 'lp-tag',
  cancelled: 'lp-tag lp-tag--accent',
}

const JOIN_WINDOW_MS = 5 * 60 * 1000

function CancelModal({ onDismiss, onConfirm }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError(t('schedule.cancelReasonRequired'))
      return
    }
    setSubmitting(true)
    try {
      await onConfirm(reason.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgb(0 0 0 / 0.4)' }}>
      <div className="lp-surface w-full max-w-sm p-5">
        <h2 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('schedule.cancelModalTitle')}</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>{t('schedule.cancelReasonLabel')}</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError('') }}
          rows={3}
          placeholder={t('schedule.cancelReasonPlaceholder')}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
        />
        {error && <p className="text-sm mt-1.5" style={{ color: '#c1443d' }}>{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onDismiss}
            className="text-sm px-3.5 py-2 rounded-lg font-medium hover:opacity-80"
            style={{ color: 'var(--ink-soft)' }}
          >
            {t('schedule.cancelDismiss')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="text-sm px-3.5 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: '#c1443d' }}
          >
            {submitting ? t('schedule.submitting') : t('schedule.cancelConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Schedule() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [now, setNow] = useState(() => Date.now())
  const [partners, setPartners] = useState([])
  const [partnersLoading, setPartnersLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [partnerFilters, setPartnerFilters] = useState({ language: '', level: '' })
  const [form, setForm] = useState({
    partner_id: searchParams.get('partner') || '',
    scheduled_time: '',
    duration_minutes: 40,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [cancelTargetId, setCancelTargetId] = useState(null)

  const loadSessions = () => client.get('/sessions/').then(({ data }) => setSessions(data))

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadSessions().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setPartnersLoading(true)
    const params = {}
    if (partnerFilters.language) params.language = partnerFilters.language
    if (partnerFilters.level) params.level = partnerFilters.level
    client.get('/matching/partners/', { params })
      .then(({ data }) => {
        setPartners(data)
        setForm((f) => (f.partner_id && !data.some((p) => String(p.user_id) === String(f.partner_id))
          ? { ...f, partner_id: '' }
          : f))
      })
      .finally(() => setPartnersLoading(false))
  }, [partnerFilters])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!partnerFilters.language || !partnerFilters.level || !form.partner_id || !form.scheduled_time) {
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

  const updateStatus = async (id, status, reason) => {
    await client.patch(`/sessions/${id}/status/`, reason ? { status, reason } : { status })
    await loadSessions()
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('schedule.language')} *</label>
              <select
                required
                value={partnerFilters.language}
                onChange={(e) => setPartnerFilters({ ...partnerFilters, language: e.target.value })}
                className={inputClass}
                style={inputStyle}
              >
                <option value="" disabled>{t('schedule.selectLanguage')}</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('schedule.level')} *</label>
              <select
                required
                value={partnerFilters.level}
                onChange={(e) => setPartnerFilters({ ...partnerFilters, level: e.target.value })}
                className={inputClass}
                style={inputStyle}
              >
                <option value="" disabled>{t('schedule.selectLevel')}</option>
                {LEVELS.map(([value]) => <option key={value} value={value}>{t(`levels.${value}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('schedule.partner')} *</label>
              <select
                required
                value={form.partner_id}
                onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                className={inputClass}
                style={inputStyle}
                disabled={partnersLoading}
              >
                <option value="" disabled>{partnersLoading ? t('partners.loading') : t('schedule.selectAPartner')}</option>
                {partners.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
                ))}
              </select>
              {!partnersLoading && partners.length === 0 && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--ink-soft)' }}>{t('schedule.noPartnersForFilters')}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('schedule.dateTime')} *</label>
              <input
                required
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
              value={form.duration_minutes}
              disabled
              readOnly
              className={`${inputClass} w-32 cursor-not-allowed opacity-60`}
              style={inputStyle}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--ink-soft)' }}>{t('schedule.durationFixed')}</p>
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
                  <Link to={`/partners/${other.id}`} className="flex items-center gap-3 hover:opacity-80">
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
                      {s.status === 'cancelled' && s.cancellation_reason && (
                        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
                          {t('schedule.cancelledReason', { reason: s.cancellation_reason })}
                        </p>
                      )}
                    </div>
                  </Link>
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
                        onClick={() => setCancelTargetId(s.id)}
                        className="text-sm px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                        style={{ background: 'var(--surface-2)', color: '#c1443d' }}
                      >
                        {t('schedule.cancelSession')}
                      </button>
                    )}
                    {s.status === 'confirmed' && (
                      new Date(s.scheduled_time).getTime() - JOIN_WINDOW_MS <= now ? (
                        <Link to={`/call/${s.room_id}`} className="lp-btn-primary text-sm px-3 py-1.5">
                          <Video size={14} /> {t('schedule.joinCall')}
                        </Link>
                      ) : (
                        <span
                          className="lp-btn-primary text-sm px-3 py-1.5 opacity-40 cursor-not-allowed select-none"
                          title={t('schedule.joinCallLocked')}
                        >
                          <Video size={14} /> {t('schedule.joinCall')}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {cancelTargetId !== null && (
        <CancelModal
          onDismiss={() => setCancelTargetId(null)}
          onConfirm={async (reason) => {
            await updateStatus(cancelTargetId, 'cancelled', reason)
            setCancelTargetId(null)
          }}
        />
      )}
    </div>
  )
}
