import { CalendarClock, CalendarPlus, ChevronRight, Filter, Star, Video, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import SendSessionRequestModal from '../components/SendSessionRequestModal'
import { useAuth } from '../context/AuthContext'
import { toDatetimeLocalValue } from '../utils/availability'
import { avatarUrl } from '../utils/images'

const statusTint = {
  pending: 'lp-tag',
  confirmed: 'lp-tag lp-tag--accent2',
  rejected: 'lp-tag lp-tag--accent',
  completed: 'lp-tag lp-tag--accent2',
  not_completed: 'lp-tag lp-tag--accent',
  cancelled: 'lp-tag lp-tag--accent',
}

const STATUS_FILTERS = ['pending', 'confirmed', 'rejected', 'completed', 'not_completed', 'cancelled']

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
                fill={value <= (hoverScore || score) ? 'var(--accent)' : 'none'}
                style={{ color: 'var(--accent)' }}
              />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={t('schedule.rateCommentPlaceholder')}
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
  const { t } = useTranslation()
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
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

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

  const filteredSessions = sessions.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false
    if (dateFilter) {
      const sessionDate = new Date(s.scheduled_time)
      const [y, m, d] = dateFilter.split('-').map(Number)
      if (sessionDate.getFullYear() !== y || sessionDate.getMonth() + 1 !== m || sessionDate.getDate() !== d) return false
    }
    return true
  })

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 lp-animate-in">
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{t('schedule.title')}</h1>
          <button type="button" onClick={() => setShowRequestModal(true)} className="lp-btn-primary shrink-0">
            <CalendarPlus size={16} /> {t('schedule.sendRequestTitle')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6 lp-animate-in">
          <Filter size={15} style={{ color: 'var(--ink-soft)' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={inputStyle}
          >
            <option value="">{t('schedule.anyStatus')}</option>
            {STATUS_FILTERS.map((value) => (
              <option key={value} value={value}>{t(`schedule.status.${value}`)}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={inputStyle}
          />
          {(statusFilter || dateFilter) && (
            <button
              type="button"
              onClick={() => { setStatusFilter(''); setDateFilter('') }}
              className="inline-flex items-center gap-1 text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--ink-soft)' }}
            >
              <XCircle size={14} /> {t('schedule.clearFilters')}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('schedule.loading')}</p>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 rounded-2xl lp-animate-in" style={{ border: '1px dashed var(--line)' }}>
            <span className="lp-icon-badge h-10 w-10 mb-3">
              <CalendarClock size={18} />
            </span>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
              {sessions.length === 0 ? t('schedule.empty') : t('schedule.noMatchingSessions')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((s, i) => {
              const isHost = s.host.id === user.id
              const other = isHost ? s.partner : s.host
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailsTarget({ session: s, other })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setDetailsTarget({ session: s, other })
                  }}
                  className={`lp-card lp-card--hover lp-animate-in lp-delay-${Math.min(i + 1, 6)} cursor-pointer`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <img src={avatarUrl(other.id, 70)} alt="" className="lp-avatar lp-gradient-ring h-11 w-11 object-cover" />
                    <div>
                      <p className="font-medium" style={{ color: 'var(--ink)' }}>
                        {s.window_end_time ? (
                          <>
                            {new Date(s.scheduled_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {', '}
                            {new Date(s.scheduled_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            {'–'}
                            {new Date(s.window_end_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            {' · '}{t('schedule.chooseATime')}
                          </>
                        ) : (
                          <>
                            {new Date(s.scheduled_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            {' · '}{t('schedule.minutesShort', { count: s.duration_minutes })}
                          </>
                        )}
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
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {!isHost && s.status === 'pending' && confirmingId !== s.id && (
                      <>
                        <button
                          onClick={() => (s.window_end_time ? openConfirm(s) : updateStatus(s.id, 'confirmed'))}
                          className="text-sm px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                          style={{ background: 'var(--surface-2)', color: 'var(--accent-2)' }}
                        >
                          {t('schedule.approve')}
                        </button>
                        <button
                          onClick={() => updateStatus(s.id, 'rejected')}
                          className="text-sm px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                          style={{ background: 'var(--surface-2)', color: '#c1443d' }}
                        >
                          {t('schedule.reject')}
                        </button>
                      </>
                    )}
                    {((isHost && s.status === 'pending') || s.status === 'confirmed') && (
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
                        <Link
                          to={`/call/${s.room_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lp-btn-primary text-sm px-3 py-1.5"
                        >
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
                    {s.status === 'completed' && (
                      s.my_rating ? (
                        <span className="lp-tag inline-flex items-center gap-1">
                          <Star size={12} fill="currentColor" /> {t('schedule.rated', { score: s.my_rating.score })}
                        </span>
                      ) : (
                        <button
                          onClick={() => setRateTarget({ id: s.id, name: other.full_name })}
                          className="lp-btn-primary text-sm px-3 py-1.5"
                        >
                          <Star size={14} /> {t('schedule.rateSession')}
                        </button>
                      )
                    )}
                  </div>
                  </div>

                  {confirmingId === s.id && (
                    <div
                      className="mt-3 pt-3 flex flex-wrap items-end gap-3 lp-animate-in-fade"
                      style={{ borderTop: '1px solid var(--line)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-soft)' }}>
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
                      <button
                        onClick={() => confirmWithChosenTime(s)}
                        className="lp-btn-primary text-sm px-3.5 py-2"
                      >
                        {t('schedule.approve')}
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="text-sm px-3 py-2 rounded-lg font-medium hover:opacity-80"
                        style={{ color: 'var(--ink-soft)' }}
                      >
                        {t('schedule.cancelDismiss')}
                      </button>
                      {confirmError && <p className="text-sm w-full" style={{ color: '#c1443d' }}>{confirmError}</p>}
                    </div>
                  )}
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
