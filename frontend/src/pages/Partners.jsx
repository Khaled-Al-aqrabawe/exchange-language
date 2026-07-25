import { CalendarCheck, CalendarPlus, CheckCircle2, Clock, Globe2, Languages, MapPin, MessageCircle, Plus, Search, Send, Sparkles, Star, Trash2, Video, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import SendSessionRequestModal from '../components/SendSessionRequestModal'
import { LANGUAGES } from '../constants'
import { useAuth } from '../context/AuthContext'
import {
  dateToDayOfWeek,
  isSlotExpiredToday,
  nextDateForDayOfWeek,
  nowTimeStr,
  timeStrPlusMinutes,
  todayStr,
} from '../utils/availability'
import { resolveAvatarUrl } from '../utils/images'

function AddAvailabilityModal({ onClose, onSaved }) {
  const { t, i18n } = useTranslation()
  const { user, refreshUser } = useAuth()
  const [slot, setSlot] = useState(() => {
    const start = nowTimeStr()
    return {
      date: todayStr(),
      start_time: start,
      end_time: timeStrPlusMinutes(start, 40),
      weekly: true,
      native_language: user?.profile?.native_language || '',
      learning_language: user?.profile?.learning_language || '',
    }
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [mySlots, setMySlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(true)

  const fieldClass = 'w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
  const fieldStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide mb-1.5'

  const loadSlots = () => client.get('/auth/me/availability/').then(({ data }) => setMySlots(data))

  useEffect(() => {
    loadSlots().finally(() => setSlotsLoading(false))
  }, [])

  const formatSlotDate = (s) => {
    const date = s.is_recurring
      ? nextDateForDayOfWeek(s.day_of_week, s.start_time)
      : new Date(`${s.specific_date}T00:00:00`)
    return date.toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (slot.end_time <= slot.start_time) {
      setError(t('partners.timeRangeError'))
      return
    }
    if (slot.date === todayStr() && slot.start_time < nowTimeStr()) {
      setError(t('partners.pastTimeError'))
      return
    }
    setSaving(true)
    try {
      const profile = user?.profile
      if (slot.native_language !== profile?.native_language || slot.learning_language !== profile?.learning_language) {
        await client.patch('/auth/me/', {
          profile: { native_language: slot.native_language, learning_language: slot.learning_language },
        })
        await refreshUser()
      }
      await client.post('/auth/me/availability/', {
        day_of_week: dateToDayOfWeek(slot.date),
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_recurring: slot.weekly,
        specific_date: slot.weekly ? null : slot.date,
      })
      setSaved(true)
      await loadSlots()
      onSaved?.()
    } catch (err) {
      const data = err.response?.data
      setError(data ? Object.values(data).flat().join(' ') : t('partners.addAvailabilityError'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    await client.delete(`/auth/me/availability/${id}/`)
    await loadSlots()
    onSaved?.()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 overflow-y-auto" style={{ background: 'color-mix(in srgb, black 45%, transparent)' }}>
      <div className="lp-surface w-full max-w-sm p-6 lp-animate-in-scale my-auto" style={{ boxShadow: 'var(--shadow-card-hover)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="lp-icon-badge h-9 w-9">
              <CalendarPlus size={16} />
            </span>
            <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{t('partners.addAvailableTime')}</h2>
          </div>
          <button type="button" onClick={onClose} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        {!slotsLoading && mySlots.length > 0 && (
          <div className="mb-5">
            <p className={labelClass} style={{ color: 'var(--ink-soft)' }}>{t('partners.myAvailableTimes')}</p>
            <ul className="space-y-1.5">
              {mySlots.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  <span className="flex items-center gap-2">
                    <span className="lp-tag lp-tag--accent2">{formatSlotDate(s)}</span>
                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                    {!s.is_recurring && (
                      <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{t('partners.oneTime')}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="hover:opacity-70 transition-opacity"
                    style={{ color: '#c1443d' }}
                    aria-label={t('profile.removeSlot')}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {saved ? (
          <div className="py-4 text-center lp-animate-in">
            <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'var(--accent-2)' }} />
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--ink)' }}>{t('partners.availabilityAdded')}</p>
            <div className="flex items-center justify-center gap-2">
              <button type="button" onClick={() => setSaved(false)} className="lp-btn-secondary">
                <Plus size={15} /> {t('partners.addAnother')}
              </button>
              <button type="button" onClick={onClose} className="lp-btn-primary">{t('common.done')}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('partners.addAvailableTimeSubtitle')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={{ color: 'var(--ink-soft)' }}>{t('auth.register.iSpeak')}</label>
                <select
                  value={slot.native_language}
                  onChange={(e) => setSlot({ ...slot, native_language: e.target.value })}
                  className={fieldClass}
                  style={fieldStyle}
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: 'var(--ink-soft)' }}>{t('auth.register.iAmLearning')}</label>
                <select
                  value={slot.learning_language}
                  onChange={(e) => setSlot({ ...slot, learning_language: e.target.value })}
                  className={fieldClass}
                  style={fieldStyle}
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--ink-soft)' }}>{t('partners.date')}</label>
              <input
                type="date"
                required
                min={todayStr()}
                value={slot.date}
                onChange={(e) => setSlot({ ...slot, date: e.target.value })}
                className={fieldClass}
                style={fieldStyle}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer" style={{ color: 'var(--ink)' }}>
              <input
                type="checkbox"
                checked={slot.weekly}
                onChange={(e) => setSlot({ ...slot, weekly: e.target.checked })}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--accent)' }}
              />
              {t('partners.repeatWeekly')}
            </label>
            <p className="text-xs -mt-2.5" style={{ color: 'var(--ink-soft)' }}>
              {slot.weekly ? t('partners.repeatWeeklyHintOn') : t('partners.repeatWeeklyHintOff')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={{ color: 'var(--ink-soft)' }}>{t('profile.startTime')}</label>
                <input
                  type="time"
                  min={slot.date === todayStr() ? nowTimeStr() : undefined}
                  value={slot.start_time}
                  onChange={(e) => setSlot({ ...slot, start_time: e.target.value })}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: 'var(--ink-soft)' }}>{t('profile.endTime')}</label>
                <input
                  type="time"
                  value={slot.end_time}
                  onChange={(e) => setSlot({ ...slot, end_time: e.target.value })}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </div>
            </div>
            {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
            <button type="submit" disabled={saving} className="lp-btn-primary w-full disabled:opacity-50">
              {saving ? t('profile.saving') : t('partners.addAvailableTime')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function IconField({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon size={15} className="absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none z-10" style={{ color: 'var(--accent)' }} />
      {children}
    </div>
  )
}

function PartnerCard({ p, i, t, i18n, filterDayOfWeek }) {
  const accent = p.match_type === 'exchange' ? 'var(--accent)' : 'var(--accent-2)'
  const visibleAvailability = (p.availability || [])
    .filter((slot) => !isSlotExpiredToday(slot))
    .filter((slot) => filterDayOfWeek == null || slot.day_of_week === filterDayOfWeek)
  return (
    <Link
      to={`/partners/${p.user_id}`}
      className={`group relative flex flex-col p-5 -m-5 rounded-[28px] transition-all duration-300 hover:-translate-y-1 lp-animate-in lp-delay-${(i % 6) + 1}`}
    >
      <span
        className="absolute inset-0 rounded-[28px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 -z-10"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}
      />

      <div className="relative mb-3">
        <span
          className="absolute -top-4 -start-4 h-24 w-24 rounded-full pointer-events-none transition-opacity duration-300 opacity-70 group-hover:opacity-100"
          style={{ background: accent, filter: 'blur(28px)', opacity: 0.28 }}
        />
        <div className="relative flex items-center gap-3">
          <img
            src={resolveAvatarUrl(p.avatar, p.user_id, 96)}
            alt=""
            className="lp-avatar lp-gradient-ring h-16 w-16 shrink-0 transition-transform duration-300 group-hover:scale-105"
            style={{ border: '3px solid var(--surface)' }}
          />
          {p.intro_video && (
            <span
              className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: 'var(--gradient-brand)', color: 'var(--accent-ink)', border: '2px solid var(--surface)' }}
              title={t('partners.hasVideo')}
            >
              <Video size={11} />
            </span>
          )}
        </div>
      </div>

      <h3 className="font-display font-bold truncate" style={{ color: 'var(--ink)' }}>{p.full_name}</h3>
      <span className="text-xs font-semibold mt-0.5" style={{ color: accent }}>
        {p.match_type === 'exchange' ? t('partners.exchangeMatch') : t('partners.peerPractice')}
      </span>

      <p className="text-sm mt-2.5" style={{ color: 'var(--ink-soft)' }}>
        {t('partners.speaksLearning', { native: p.native_language, learning: p.learning_language })}
      </p>
      <p className="text-xs capitalize" style={{ color: 'var(--ink-soft)', opacity: 0.75 }}>
        {t(`levels.${p.proficiency_level}`, p.proficiency_level)} · {p.timezone}
      </p>

      <p className="text-sm mt-3 line-clamp-2 flex-1" style={{ color: 'var(--ink-soft)' }}>
        {p.bio || t('partnerProfile.noBio')}
      </p>

      {visibleAvailability.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs font-medium" style={{ color: 'var(--accent-2)' }}>
          {visibleAvailability.slice(0, 2).map((slot) => (
            <span key={slot.id} className="inline-flex items-center gap-1">
              <Clock size={11} />
              {nextDateForDayOfWeek(slot.day_of_week, slot.start_time).toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short', day: 'numeric' })}
              {' '}{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
        {p.country && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} /> {p.country}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <CalendarCheck size={12} /> {t('partners.sessionsCount', { count: p.sessions_completed })}
        </span>
        {p.ratings_count > 0 && (
          <span className="inline-flex items-center gap-1" style={{ color: '#c98a1c' }}>
            <Star size={12} fill="currentColor" /> {p.average_rating}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-1.5 mt-3 text-sm font-semibold opacity-0 -translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
        style={{ color: 'var(--accent)' }}
      >
        <MessageCircle size={14} /> {t('partners.viewProfile')}
      </div>
    </Link>
  )
}

export default function Partners() {
  const { t, i18n } = useTranslation()
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibility, setVisibility] = useState('available')
  const [filters, setFilters] = useState({ learning: '', speaking: '', date: '' })
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)

  const load = () => {
    setLoading(true)
    const params = {}
    if (filters.learning) params.language = filters.learning
    if (filters.speaking) params.speaks = filters.speaking
    if (filters.date) params.day = dateToDayOfWeek(filters.date)
    client.get('/matching/partners/', { params })
      .then(({ data }) => setPartners(data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filters, t])

  const withAvailability = partners.filter((p) => p.availability?.length > 0)
  const visiblePartners = visibility === 'available' ? withAvailability : partners

  const ghostFieldClass = 'w-full bg-transparent ps-6 pe-2 py-2 text-sm font-medium transition-colors focus:outline-none'
  const ghostFieldStyle = { borderBottom: '2px solid var(--line)', color: 'var(--ink)' }
  const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide mb-1'

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div
        className="absolute -top-24 -end-24 h-72 w-72 rounded-full pointer-events-none lp-blob-drift"
        style={{ background: 'var(--accent)', opacity: 0.16, filter: 'blur(70px)' }}
      />
      <div
        className="absolute top-[420px] -start-16 h-72 w-72 rounded-full pointer-events-none lp-blob-drift"
        style={{ background: 'var(--accent-2)', opacity: 0.16, filter: 'blur(70px)', animationDelay: '3s' }}
      />

      <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 relative">
          <div className="lp-animate-in text-center sm:text-start">
            <p className="lp-eyebrow mb-1.5">{t('partners.eyebrow')}</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-2 lp-gradient-text">{t('partners.title')}</h1>
            <p className="text-sm sm:text-base mb-6 max-w-lg mx-auto sm:mx-0" style={{ color: 'var(--ink-soft)' }}>{t('partners.subtitle')}</p>

            {!loading && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-1 mb-9 text-sm lp-animate-in-fade">
                <span style={{ color: 'var(--ink)' }}>
                  <strong className="font-display text-lg" style={{ color: 'var(--accent)' }}>{partners.length}</strong>{' '}
                  <span style={{ color: 'var(--ink-soft)' }}>{t('partners.statFound')}</span>
                </span>
                <span style={{ color: 'var(--ink)' }}>
                  <strong className="font-display text-lg" style={{ color: 'var(--accent-2)' }}>{withAvailability.length}</strong>{' '}
                  <span style={{ color: 'var(--ink-soft)' }}>{t('partners.statWithTime')}</span>
                </span>
              </div>
            )}
          </div>

          <div className="lp-animate-in lp-delay-1">
            <div className="flex items-center justify-center sm:justify-between gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVisibility('available')}
                  className="relative px-1 py-1.5 text-sm font-semibold transition-colors me-5"
                  style={{ color: visibility === 'available' ? 'var(--ink)' : 'var(--ink-soft)' }}
                >
                  {t('partners.visibilityAvailable')}
                  {visibility === 'available' && (
                    <span className="absolute left-0 right-0 -bottom-0.5 h-[2.5px] rounded-full" style={{ background: 'var(--gradient-brand)' }} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisibility('all')
                    setFilters((f) => ({ ...f, date: '' }))
                  }}
                  className="relative px-1 py-1.5 text-sm font-semibold transition-colors"
                  style={{ color: visibility === 'all' ? 'var(--ink)' : 'var(--ink-soft)' }}
                >
                  {t('partners.visibilityAll')}
                  {visibility === 'all' && (
                    <span className="absolute left-0 right-0 -bottom-0.5 h-[2.5px] rounded-full" style={{ background: 'var(--gradient-brand)' }} />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => setShowRequestModal(true)} className="lp-btn-secondary shrink-0">
                  <Send size={15} /> {t('schedule.sendRequestTitle')}
                </button>
                <button type="button" onClick={() => setShowAvailabilityModal(true)} className="lp-btn-primary shrink-0">
                  <CalendarPlus size={15} /> {t('partners.addAvailableTime')}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <div className="w-40">
                <label className={labelClass} style={{ color: 'var(--ink-soft)' }}>{t('auth.register.iAmLearning')}</label>
                <IconField icon={Globe2}>
                  <select
                    value={filters.learning}
                    onChange={(e) => setFilters({ ...filters, learning: e.target.value })}
                    className={ghostFieldClass}
                    style={ghostFieldStyle}
                  >
                    <option value="">{t('partners.anyLanguage')}</option>
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </IconField>
              </div>
              <div className="w-40">
                <label className={labelClass} style={{ color: 'var(--ink-soft)' }}>{t('auth.register.iSpeak')}</label>
                <IconField icon={Languages}>
                  <select
                    value={filters.speaking}
                    onChange={(e) => setFilters({ ...filters, speaking: e.target.value })}
                    className={ghostFieldClass}
                    style={ghostFieldStyle}
                  >
                    <option value="">{t('partners.anyLanguage')}</option>
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </IconField>
              </div>
              {visibility === 'available' && (
                <div className="w-44">
                  <label className={labelClass} style={{ color: 'var(--ink-soft)' }}>{t('partners.date')}</label>
                  <input
                    type="date"
                    min={todayStr()}
                    value={filters.date}
                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                    className="w-full bg-transparent pe-2 py-2 text-sm font-medium transition-colors focus:outline-none"
                    style={ghostFieldStyle}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-8">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 w-16 rounded-full mb-3" style={{ background: 'var(--surface-2)' }} />
                <div className="h-3.5 w-2/3 rounded mb-2" style={{ background: 'var(--surface-2)' }} />
                <div className="h-3 w-1/3 rounded mb-4" style={{ background: 'var(--surface-2)' }} />
                <div className="h-3 rounded w-4/5" style={{ background: 'var(--surface-2)' }} />
              </div>
            ))}
          </div>
        ) : visiblePartners.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 lp-animate-in">
            <span className="lp-icon-badge h-12 w-12 mb-4">
              <Search size={20} />
            </span>
            <p className="text-sm max-w-sm" style={{ color: 'var(--ink-soft)' }}>
              {visibility === 'available' ? t('partners.emptyAvailable') : t('partners.empty')}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {visiblePartners.map((p, i) => (
              <PartnerCard
                key={p.user_id}
                p={p}
                i={i}
                t={t}
                i18n={i18n}
                filterDayOfWeek={filters.date ? dateToDayOfWeek(filters.date) : null}
              />
            ))}
          </div>
        )}

        {!loading && visiblePartners.length > 0 && visibility === 'available' && withAvailability.length < partners.length && (
          <p className="flex items-center justify-center gap-1.5 text-xs mt-8 lp-animate-in" style={{ color: 'var(--ink-soft)' }}>
            <Sparkles size={13} style={{ color: 'var(--accent)' }} />
            {t('partners.moreWithAllHint', { count: partners.length - withAvailability.length })}
          </p>
        )}
      </div>

      {showAvailabilityModal && (
        <AddAvailabilityModal onClose={() => setShowAvailabilityModal(false)} onSaved={load} />
      )}

      {showRequestModal && (
        <SendSessionRequestModal onClose={() => setShowRequestModal(false)} onSent={load} />
      )}
    </div>
  )
}
