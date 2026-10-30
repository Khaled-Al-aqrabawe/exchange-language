import { CalendarClock, CalendarPlus, ChevronRight, Clock, FileText, Star, Video, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { LOW_RATING_MAX } from '../constants'
import SendSessionRequestModal from '../components/SendSessionRequestModal'
import { useAuth } from '../context/AuthContext'
import { toDatetimeLocalValue } from '../utils/availability'
import { downloadText } from '../utils/downloadFile'
import { avatarUrl } from '../utils/images'
import { buildSummaryText } from '../utils/sessionSummary'

const statusTint = {
  pending: 'lp-tag',
  confirmed: 'lp-tag lp-tag--accent2',
  rejected: 'lp-tag lp-tag--accent',
  completed: 'lp-tag lp-tag--accent2',
  not_completed: 'lp-tag lp-tag--accent',
  cancelled: 'lp-tag lp-tag--accent',
}

// The tabs group the statuses the way people think about their sessions
const TABS = [
  ['all', null],
  ['upcoming', ['pending', 'confirmed']],
  ['past', ['completed']],
  ['uncompleted', ['not_completed']],
  ['closed', ['cancelled', 'rejected']],
]

// Colour of the date tile on each card
const TILE_TINT = {
  pending: '#fbbf24',
  confirmed: 'var(--accent)',
  completed: '#34d399',
  not_completed: '#fb923c',
  cancelled: '#f87171',
  rejected: '#f87171',
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lp-animate-in-fade" style={{ background: 'rgb(0 0 0 / 0.5)' }}>
      <div className="lp-surface w-full max-w-sm p-5 lp-animate-in-scale" style={{ boxShadow: 'var(--shadow-card-hover)' }}>
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

function RatingModal({ partnerName, onDismiss, onConfirm }) {
  const { t } = useTranslation()
  const [score, setScore] = useState(0)
  const [hoverScore, setHoverScore] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!score) {
      setError(t('schedule.ratingRequired'))
      return
    }
    if (score <= LOW_RATING_MAX && !comment.trim()) {
      setError(t('schedule.lowRatingReason'))
      return
    }
    setSubmitting(true)
    try {
      await onConfirm(score, comment.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lp-animate-in-fade" style={{ background: 'rgb(0 0 0 / 0.5)' }}>
      <div className="lp-surface w-full max-w-sm p-5 lp-animate-in-scale" style={{ boxShadow: 'var(--shadow-card-hover)' }}>
        <h2 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('schedule.rateModalTitle', { name: partnerName })}</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>{t('schedule.rateModalSubtitle')}</p>
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => { setScore(value); setError('') }}
              onMouseEnter={() => setHoverScore(value)}
              onMouseLeave={() => setHoverScore(0)}
              aria-label={t('schedule.rateStars', { count: value })}
            >
              <Star
                size={26}
                fill={value <= (hoverScore || score) ? '#f5b301' : 'none'}
                style={{ color: '#f5b301' }}
              />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={score && score <= LOW_RATING_MAX ? t('schedule.lowRatingPlaceholder') : t('schedule.rateCommentPlaceholder')}
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
            className="lp-btn-primary text-sm px-3.5 py-2 disabled:opacity-50"
          >
            {submitting ? t('schedule.submitting') : t('schedule.rateSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SessionDetailsModal({ session, other, onClose }) {
  const { t } = useTranslation()
  const date = new Date(session.scheduled_time)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lp-animate-in-fade" style={{ background: 'rgb(0 0 0 / 0.5)' }}>
      <div className="lp-surface w-full max-w-sm overflow-hidden lp-animate-in-scale" style={{ boxShadow: 'var(--shadow-card-hover)' }}>
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{t('schedule.sessionDetails')}</h2>
          <button type="button" onClick={onClose} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--ink-soft)' }}>{t('schedule.dateTime')}</span>
            <span className="font-medium" style={{ color: 'var(--ink)' }}>
              {date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--ink-soft)' }}>{t('schedule.duration')}</span>
            <span className="font-medium" style={{ color: 'var(--ink)' }}>{t('schedule.minutesShort', { count: session.duration_minutes })}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--ink-soft)' }}>{t('schedule.status.label')}</span>
            <span className={statusTint[session.status]}>{t(`schedule.status.${session.status}`)}</span>
          </div>
          {session.notes && (
            <div className="text-sm pt-1" style={{ borderTop: '1px solid var(--line)' }}>
              <p className="mt-3" style={{ color: 'var(--ink-soft)' }}>{session.notes}</p>
            </div>
          )}
          {session.my_rating && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--ink-soft)' }}>{t('schedule.yourRating')}</span>
              <span className="lp-tag inline-flex items-center gap-1">
                <Star size={12} fill="currentColor" /> {t('schedule.rated', { score: session.my_rating.score })}
              </span>
            </div>
          )}
        </div>

        <Link
          to={`/partners/${other.id}`}
          onClick={onClose}
          className="flex items-center gap-3 p-5 hover:opacity-80 transition-opacity"
          style={{ borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}
        >
          <img src={avatarUrl(other.id, 70)} alt="" className="lp-avatar lp-gradient-ring h-11 w-11 object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate" style={{ color: 'var(--ink)' }}>{other.full_name}</p>
            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{t('schedule.viewProfile')}</p>
          </div>
          <ChevronRight size={16} className="shrink-0 rtl:rotate-180" style={{ color: 'var(--ink-soft)' }} />
        </Link>
      </div>
    </div>
  )
}

export default function Schedule() {
  const { t, i18n } = useTranslation()

  // The summary (notes, chat, shared lessons) is a text file; there is no page for it.
  const downloadSummary = async (sessionId) => {
    try {
      const { data } = await client.get(`/sessions/${sessionId}/summary/`)
      downloadText(`session-summary-${sessionId}.txt`, buildSummaryText(data, t, i18n.resolvedLanguage))
    } catch {
      window.alert(t('summary.notFound'))
    }
  }
  const { user } = useAuth()
  const [now, setNow] = useState(() => Date.now())
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelTargetId, setCancelTargetId] = useState(null)
  const [rateTarget, setRateTarget] = useState(null)
  const [detailsTarget, setDetailsTarget] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [confirmTime, setConfirmTime] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [tab, setTab] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const inputClass = 'w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
  const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

  const loadSessions = () => client.get('/sessions/').then(({ data }) => setSessions(data))

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadSessions().finally(() => setLoading(false))
  }, [])

  const updateStatus = async (id, status, reason) => {
    await client.patch(`/sessions/${id}/status/`, reason ? { status, reason } : { status })
    await loadSessions()
  }

  const openConfirm = (session) => {
    setConfirmingId(session.id)
    setConfirmError('')
    setConfirmTime(toDatetimeLocalValue(new Date(session.scheduled_time)))
  }

  const confirmWithChosenTime = async (session) => {
    setConfirmError('')
    try {
      await client.patch(`/sessions/${session.id}/status/`, {
        status: 'confirmed',
        scheduled_time: new Date(confirmTime).toISOString(),
      })
      setConfirmingId(null)
      await loadSessions()
    } catch (err) {
      const data = err.response?.data
      setConfirmError(data ? Object.values(data).flat().join(' ') : t('schedule.errorFailed'))
    }
  }

  const submitRating = async (id, score, comment) => {
    await client.post(`/sessions/${id}/rate/`, { score, comment })
    await loadSessions()
  }

  const inTab = (session, key) => {
    const statuses = TABS.find(([name]) => name === key)[1]
    return !statuses || statuses.includes(session.status)
  }
  // Compares local calendar days, so a session late in the evening still counts for its own day.
  const matchesDate = (session) => {
    if (!dateFrom && !dateTo) return true
    const d = new Date(session.scheduled_time)
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo)
  }
  const isOpen = (session) => ['pending', 'confirmed'].includes(session.status)

  // newest at the top
  const filteredSessions = sessions
    .filter((s) => inTab(s, tab) && matchesDate(s))
    .sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time))

  const locale = i18n.resolvedLanguage

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="mx-auto max-w-6xl px-6 pb-8 pt-10">
          <div className="lp-animate-in flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: 'var(--ink)' }}>{t('schedule.title')}</h1>
              <p className="mt-2 max-w-md text-sm sm:text-base" style={{ color: 'var(--ink-soft)' }}>{t('schedule.subtitle')}</p>
            </div>
            <button type="button" onClick={() => setShowRequestModal(true)} className="lp-btn-primary shrink-0">
              <CalendarPlus size={16} /> {t('schedule.sendRequestTitle')}
            </button>
          </div>

          <div className="lp-animate-in lp-delay-1 mt-7 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap rounded-full p-1" style={{ background: 'var(--surface-2)' }}>
              {TABS.map(([key]) => {
                const count = sessions.filter((s) => inTab(s, key)).length
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all"
                    style={tab === key
                      ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)', boxShadow: '0 6px 16px -8px rgb(20 184 166 / 0.9)' }
                      : { color: 'var(--ink-soft)' }}
                  >
                    {t(`schedule.tab.${key}`)}
                    <span className="rounded-full px-1.5 text-[11px] font-extrabold" style={tab === key ? { background: 'rgb(255 255 255 / 0.25)' } : { background: 'var(--line)' }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              {[['dateFrom', dateFrom, setDateFrom, undefined, dateTo || undefined], ['dateTo', dateTo, setDateTo, dateFrom || undefined, undefined]].map(([key, value, setValue, min, max]) => (
                <label key={key} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>
                  {t(`schedule.${key}`)}
                  <input
                    type="date"
                    value={value}
                    min={min}
                    max={max}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-10 rounded-full px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    style={inputStyle}
                  />
                </label>
              ))}
              {(dateFrom || dateTo) && (
                <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }} className="inline-flex items-center gap-1 text-sm font-semibold hover:opacity-80" style={{ color: 'var(--accent)' }}>
                  <XCircle size={14} /> {t('schedule.clearFilters')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((n) => (
              <div key={n} className="lp-card flex animate-pulse items-center gap-4" style={{ padding: '1.1rem 1.25rem' }}>
                <div className="h-16 w-16 rounded-2xl" style={{ background: 'var(--surface-2)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-3 w-1/2 rounded" style={{ background: 'var(--surface-2)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="lp-card lp-animate-in mx-auto flex max-w-xl flex-col items-center py-14 text-center">
            <span className="lp-icon-badge mb-4 h-14 w-14"><CalendarClock size={22} /></span>
            <p className="max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>
              {sessions.length === 0 ? t('schedule.empty') : t('schedule.noMatchingSessions')}
            </p>
            {sessions.length === 0 && (
              <Link to="/partners" className="lp-btn-primary mt-6 text-sm">{t('schedule.findPartners')}</Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((s, i) => {
              const isHost = s.host.id === user.id
              const other = isHost ? s.partner : s.host
              const start = new Date(s.scheduled_time)
              const tint = TILE_TINT[s.status] || 'var(--accent)'
              return (
                <article
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailsTarget({ session: s, other })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setDetailsTarget({ session: s, other })
                  }}
                  className={`lp-card lp-card--hover lp-animate-in lp-delay-${Math.min(i + 1, 6)} cursor-pointer`}
                  style={{ padding: '1.1rem 1.25rem' }}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Date tile */}
                    <div
                      className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl"
                      style={{ background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint }}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider">{start.toLocaleDateString(locale, { month: 'short' })}</span>
                      <span className="font-display text-2xl font-extrabold leading-none">{start.getDate()}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <img src={avatarUrl(other.id, 60)} alt="" className="lp-avatar h-7 w-7 shrink-0 object-cover" />
                        <p className="truncate text-base font-bold" style={{ color: 'var(--ink)' }}>{other.full_name}</p>
                        <span className={statusTint[s.status]}>{t(`schedule.status.${s.status}`)}</span>
                      </div>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--ink-soft)' }}>
                        <Clock size={13} />
                        {s.window_end_time ? (
                          <>
                            {start.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
                            {'–'}
                            {new Date(s.window_end_time).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
                            {' · '}{t('schedule.chooseATime')}
                          </>
                        ) : (
                          <>
                            {start.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
                            {' · '}{t('schedule.minutesShort', { count: s.duration_minutes })}
                          </>
                        )}
                      </p>
                      {s.notes && <p className="mt-1 line-clamp-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{s.notes}</p>}
                      {s.status === 'cancelled' && s.cancellation_reason && (
                        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                          {t('schedule.cancelledReason', { reason: s.cancellation_reason })}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!isHost && s.status === 'pending' && confirmingId !== s.id && (
                        <>
                          <button
                            onClick={() => (s.window_end_time ? openConfirm(s) : updateStatus(s.id, 'confirmed'))}
                            className="rounded-full px-4 py-2 text-sm font-bold hover:opacity-80"
                            style={{ background: 'color-mix(in srgb, #34d399 18%, transparent)', color: '#34d399' }}
                          >
                            {t('schedule.approve')}
                          </button>
                          <button
                            onClick={() => updateStatus(s.id, 'rejected')}
                            className="rounded-full px-4 py-2 text-sm font-bold hover:opacity-80"
                            style={{ background: 'color-mix(in srgb, #f87171 16%, transparent)', color: '#f87171' }}
                          >
                            {t('schedule.reject')}
                          </button>
                        </>
                      )}
                      {((isHost && s.status === 'pending') || s.status === 'confirmed') && (
                        <button
                          onClick={() => setCancelTargetId(s.id)}
                          className="rounded-full px-4 py-2 text-sm font-bold hover:opacity-80"
                          style={{ background: 'color-mix(in srgb, #f87171 16%, transparent)', color: '#f87171' }}
                        >
                          {t('schedule.cancelSession')}
                        </button>
                      )}
                      {s.status === 'confirmed' && (
                        start.getTime() - JOIN_WINDOW_MS <= now ? (
                          <Link to={`/call/${s.room_id}`} target="_blank" rel="noopener noreferrer" className="lp-btn-primary text-sm" style={{ padding: '0.55rem 1.1rem' }}>
                            <Video size={14} /> {t('schedule.joinCall')}
                          </Link>
                        ) : (
                          <span
                            className="lp-btn-primary cursor-not-allowed select-none text-sm opacity-40"
                            style={{ padding: '0.55rem 1.1rem' }}
                            title={t('schedule.joinCallLocked')}
                          >
                            <Video size={14} /> {t('schedule.joinCall')}
                          </span>
                        )
                      )}
                      {['completed', 'not_completed'].includes(s.status) && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); downloadSummary(s.id) }} className="lp-btn-secondary text-sm" style={{ padding: '0.5rem 1rem' }}>
                          <FileText size={14} /> {t('summary.link')}
                        </button>
                      )}
                      {['completed', 'not_completed'].includes(s.status) && (
                        s.my_rating ? (
                          <span className="lp-tag inline-flex items-center gap-1" style={{ color: '#f5b301' }}>
                            <Star size={12} fill="currentColor" /> {t('schedule.rated', { score: s.my_rating.score })}
                          </span>
                        ) : (
                          <button
                            onClick={() => setRateTarget({ id: s.id, name: other.full_name })}
                            className="lp-btn-primary text-sm"
                            style={{ padding: '0.55rem 1.1rem' }}
                          >
                            <Star size={14} /> {t('schedule.rateSession')}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {confirmingId === s.id && (
                    <div
                      className="lp-animate-in-fade mt-4 flex flex-wrap items-end gap-3 pt-4"
                      style={{ borderTop: '1px solid var(--line)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>
                          {t('schedule.chooseATime')}
                        </label>
                        <input
                          type="datetime-local"
                          value={confirmTime}
                          min={toDatetimeLocalValue(new Date(s.scheduled_time))}
                          max={toDatetimeLocalValue(new Date(s.window_end_time))}
                          onChange={(e) => setConfirmTime(e.target.value)}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </div>
                      <button onClick={() => confirmWithChosenTime(s)} className="lp-btn-primary text-sm" style={{ padding: '0.6rem 1.2rem' }}>
                        {t('schedule.approve')}
                      </button>
                      <button onClick={() => setConfirmingId(null)} className="rounded-full px-3 py-2 text-sm font-medium hover:opacity-80" style={{ color: 'var(--ink-soft)' }}>
                        {t('schedule.cancelDismiss')}
                      </button>
                      {confirmError && <p className="w-full text-sm" style={{ color: '#f87171' }}>{confirmError}</p>}
                    </div>
                  )}
                </article>
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

      {rateTarget !== null && (
        <RatingModal
          partnerName={rateTarget.name}
          onDismiss={() => setRateTarget(null)}
          onConfirm={async (score, comment) => {
            await submitRating(rateTarget.id, score, comment)
            setRateTarget(null)
          }}
        />
      )}

      {detailsTarget !== null && (
        <SessionDetailsModal
          session={detailsTarget.session}
          other={detailsTarget.other}
          onClose={() => setDetailsTarget(null)}
        />
      )}

      {showRequestModal && (
        <SendSessionRequestModal
          onClose={() => setShowRequestModal(false)}
          onSent={loadSessions}
        />
      )}
    </div>
  )
}
