import { ArrowRight, BookOpen, CalendarCheck, CalendarPlus, CheckCircle2, Clock, GraduationCap, Globe2, Info, MapPin, MessageCircle, MessagesSquare, Phone, Plus, Search, Sparkles, Star, Trash2, User, Video, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import ModalShell, { Chip, ModalField, Switch, localDateString, modalInputClass, modalInputStyle } from '../components/ModalShell'
import SendSessionRequestModal from '../components/SendSessionRequestModal'
import CallNowModal from '../components/CallNowModal'
import SessionTypePicker, { FINISHED_STYLE, lessonLabel, useMyLessons } from '../components/SessionTypePicker'
import { useAuth } from '../context/AuthContext'
import {
  dateToDayOfWeek,
  formatTime12,
  isSlotExpiredToday,
  nextDateForDayOfWeek,
  nowTimeStr,
  timeStrPlusMinutes,
  todayStr,
} from '../utils/availability'
import { resolveAvatarUrl } from '../utils/images'

// Everything this person has offered: when, whether it repeats, what it is for. Each can be removed.
function MyAvailabilityModal({ onClose, onChanged, onAdd }) {
  const { t, i18n } = useTranslation()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => client.get('/auth/me/availability/').then(({ data }) => setSlots(data))
  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const dateOf = (s) => (s.is_recurring ? nextDateForDayOfWeek(s.day_of_week, s.start_time) : new Date(`${s.specific_date}T00:00:00`))
  const remove = async (id) => {
    await client.delete(`/auth/me/availability/${id}/`)
    await load()
    onChanged?.()
  }

  return (
    <ModalShell
      icon={CalendarCheck}
      title={t('partners.myAvailableTimes')}
      subtitle={t('partners.myAvailableTimesSubtitle', 'The times partners can see and ask you for.')}
      onClose={onClose}
      footer={<button type="button" onClick={onAdd} className="lp-btn-primary w-full"><CalendarPlus size={16} /> {t('partners.addAvailableTime')}</button>}
    >
      {loading ? (
        <p className="py-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('partners.loading')}</p>
      ) : slots.length === 0 ? (
        <p className="rounded-2xl px-4 py-6 text-center text-sm" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
          {t('partners.noAvailableTimes', 'You have not added any available times yet.')}
        </p>
      ) : (
        <div className="space-y-2.5">
          {[...slots].sort((a, b) => dateOf(a) - dateOf(b)).map((s) => {
            const conversation = s.session_type === 'conversation'
            const TypeIcon = conversation ? MessagesSquare : BookOpen
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-extrabold uppercase leading-none" style={{ background: 'color-mix(in srgb, var(--accent) 14%, var(--surface))', color: 'var(--accent)' }}>
                  {dateOf(s).toLocaleDateString(i18n.resolvedLanguage, { month: 'short' })}
                  <span className="mt-0.5 text-base">{dateOf(s).getDate()}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                    {dateOf(s).toLocaleDateString(i18n.resolvedLanguage, { weekday: 'long' })} · {formatTime12(s.start_time)}–{formatTime12(s.end_time)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--ink-soft)' }}>
                    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--accent)' }}>
                      <TypeIcon size={12} />
                      {conversation
                        ? t('partners.typeConversation', 'Free conversation')
                        : `${t('partners.typeLesson', 'From the lessons')}${s.lesson ? ` · ${t('partners.lessonOption', { n: s.lesson })}` : ''}`}
                    </span>
                    <span>{s.is_recurring ? t('partners.repeatsWeekly', 'Repeats weekly') : t('partners.oneTime')}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,#f87171_22%,transparent)]"
                  style={{ color: '#f87171' }}
                  aria-label={t('profile.removeSlot')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </ModalShell>
  )
}

function AddAvailabilityModal({ onClose, onSaved }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const profileLang = user?.profile
  const speakOptions = [...new Set([profileLang?.native_language, ...(profileLang?.spoken_languages || [])].filter(Boolean))]
  const [slot, setSlot] = useState(() => {
    const start = nowTimeStr()
    return {
      date: todayStr(),
      start_time: start,
      end_time: timeStrPlusMinutes(start, 40),
      weekly: true,
      native_language: speakOptions[0] || '',
      session_type: 'lesson',
      lesson: '',
    }
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  // Every session is 40 minutes, so the end time follows the start time.
  const setStart = (start_time) => setSlot((s) => ({ ...s, start_time, end_time: timeStrPlusMinutes(start_time, 40) }))

  // Checked as the times are typed, so a bad time is flagged straight away.
  const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
  const timeError = !slot.start_time || !slot.end_time ? ''
    : slot.date === todayStr() && slot.start_time < nowTimeStr() ? t('partners.pastTimeError')
      : slot.end_time <= slot.start_time ? t('partners.timeRangeError')
        : minutesOf(slot.end_time) - minutesOf(slot.start_time) < 40 ? t('partners.minDurationError', 'An available time must be at least 40 minutes long.')
          : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (timeError) {
      setError(timeError)
      return
    }
    setSaving(true)
    try {
      await client.post('/auth/me/availability/', {
        day_of_week: dateToDayOfWeek(slot.date),
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_recurring: slot.weekly,
        specific_date: slot.weekly ? null : slot.date,
        session_type: slot.session_type,
        lesson: slot.session_type === 'lesson' && slot.lesson ? Number(slot.lesson) : null,
      })
      setSaved(true)
      onSaved?.()
    } catch (err) {
      const data = err.response?.data
      setError(data ? Object.values(data).flat().join(' ') : t('partners.addAvailabilityError'))
    } finally {
      setSaving(false)
    }
  }

  const dayChips = [0, 1].map((offset) => {
    const value = localDateString(offset)
    const label = offset === 0 ? t('modal.today') : offset === 1 ? t('modal.tomorrow')
      : new Date(`${value}T00:00:00`).toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short', day: 'numeric' })
    return { value, label }
  })

  return (
    <ModalShell
      wide
      icon={CalendarPlus}
      title={t('partners.addAvailableTime')}
      subtitle={saved ? undefined : t('partners.addAvailableTimeSubtitle')}
      onClose={onClose}
      footer={saved ? null : (
        <button type="submit" form="availability-form" disabled={saving || !!timeError} className="lp-btn-primary w-full disabled:opacity-50">
          {saving ? t('profile.saving') : t('partners.addAvailableTime')}
        </button>
      )}
    >
      {saved ? (
        <div className="lp-animate-in py-6 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, #34d399 18%, transparent)', color: '#34d399' }}>
            <CheckCircle2 size={34} />
          </span>
          <p className="mb-6 font-display text-lg font-bold" style={{ color: 'var(--ink)' }}>{t('partners.availabilityAdded')}</p>
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => setSaved(false)} className="lp-btn-secondary"><Plus size={15} /> {t('partners.addAnother')}</button>
            <button type="button" onClick={onClose} className="lp-btn-primary">{t('common.done')}</button>
          </div>
        </div>
      ) : (
        <form id="availability-form" onSubmit={handleSubmit} className="space-y-5">
          {speakOptions.length > 1 && (
            <div className="grid grid-cols-2 gap-4">
              {speakOptions.length > 1 && (
                <ModalField label={t('partners.iTeach', 'I want to teach')} icon={Globe2}>
                  <select value={slot.native_language} onChange={(e) => setSlot({ ...slot, native_language: e.target.value })} className={`${modalInputClass} ps-11`} style={modalInputStyle}>
                    {speakOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </ModalField>
              )}
            </div>
          )}

          <SessionTypePicker type={slot.session_type} lesson={slot.lesson} onChange={(patch) => setSlot((s) => ({ ...s, ...patch }))} />

          <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <ModalField label={t('partners.date')} icon={CalendarCheck}>
              <input
                type="date"
                required
                min={todayStr()}
                value={slot.date}
                onChange={(e) => setSlot({ ...slot, date: e.target.value })}
                className={`${modalInputClass} ps-11`}
                style={modalInputStyle}
              />
            </ModalField>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {dayChips.map((c) => (
                <Chip key={c.value} active={slot.date === c.value} onClick={() => setSlot({ ...slot, date: c.value })}>{c.label}</Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-4">
              <ModalField label={t('profile.startTime')} icon={Clock}>
                <input
                  type="time"
                  min={slot.date === todayStr() ? nowTimeStr() : undefined}
                  value={slot.start_time}
                  onChange={(e) => setStart(e.target.value)}
                  className={`${modalInputClass} ps-11`}
                  style={modalInputStyle}
                />
              </ModalField>
              <ModalField label={t('profile.endTime')} icon={Clock}>
                <input
                  type="time"
                  min={timeStrPlusMinutes(slot.start_time, 40)}
                  value={slot.end_time}
                  onChange={(e) => setSlot({ ...slot, end_time: e.target.value })}
                  className={`${modalInputClass} ps-11`}
                  style={modalInputStyle}
                />
              </ModalField>
            </div>
            {timeError && <p className="mt-2 text-sm font-semibold" style={{ color: '#f87171' }}>{timeError}</p>}
          </div>

          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{t('partners.repeatWeekly')}</p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-soft)' }}>
                {slot.weekly ? t('partners.repeatWeeklyHintOn') : t('partners.repeatWeeklyHintOff')}
              </p>
            </div>
            <Switch checked={slot.weekly} onChange={(weekly) => setSlot({ ...slot, weekly })} label={t('partners.repeatWeekly')} />
          </div>

          {error && (
            <p className="rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: 'color-mix(in srgb, #f87171 14%, transparent)', color: '#f87171' }}>{error}</p>
          )}
        </form>
      )}
    </ModalShell>
  )
}

// A labelled field on the filter bar
const CEFR_NAMES = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper-intermediate', C1: 'Advanced', C2: 'Proficient' }

function FilterField({ label, icon: Icon, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{label}</span>
      <span className="relative block">
        <Icon size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--accent)' }} />
        {children}
      </span>
    </label>
  )
}

const fieldClass = 'h-11 w-full rounded-xl ps-10 pe-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
const fieldStyle = { background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink)' }

function PartnerCard({ p, i, t, i18n, filterDayOfWeek, filterTime, onMessage, onSchedule, onCall }) {
  const exchange = p.match_type === 'exchange'
  const visibleAvailability = (p.availability || [])
    .filter((slot) => !isSlotExpiredToday(slot))
    .filter((slot) => filterDayOfWeek == null || slot.day_of_week === filterDayOfWeek)
    .filter((slot) => !filterTime || (slot.start_time.slice(0, 5) <= filterTime && filterTime <= slot.end_time.slice(0, 5)))

  const cover = exchange
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, var(--surface)), color-mix(in srgb, var(--gold) 12%, var(--surface)))'
    : 'linear-gradient(135deg, color-mix(in srgb, var(--accent-2) 16%, var(--surface)), color-mix(in srgb, var(--accent) 12%, var(--surface)))'

  return (
    <article
      className={`lp-card lp-card--hover flex flex-col overflow-hidden lp-animate-in lp-delay-${(i % 6) + 1}`}
      style={{ padding: 0 }}
    >
      <div className="relative h-20 shrink-0" style={{ background: cover }}>
        {p.is_available_now && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: 'rgb(0 0 0 / 0.35)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
            {t('partners.visibilityNow')}
          </span>
        )}
        <span className="absolute end-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: 'rgb(0 0 0 / 0.35)' }}>
          {exchange ? t('partners.exchangeMatch') : t('partners.peerPractice')}
        </span>
      </div>

      <div className="-mt-9 flex flex-1 flex-col px-5 pb-5">
        <Link to={`/partners/${p.user_id}`} className="relative w-fit">
          <img
            src={resolveAvatarUrl(p.avatar, p.user_id, 144)}
            alt=""
            className="lp-avatar h-[72px] w-[72px] object-cover"
            style={{ border: '4px solid var(--surface)' }}
          />
          {p.intro_video && (
            <span
              className="absolute -bottom-0.5 -end-0.5 flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: 'var(--gradient-brand)', color: 'var(--accent-ink)', border: '2px solid var(--surface)' }}
              title={t('partners.hasVideo')}
            >
              <Video size={11} />
            </span>
          )}
        </Link>

        <Link to={`/partners/${p.user_id}`} className="mt-3 block hover:opacity-80">
          <h3 className="truncate font-display text-lg font-bold" style={{ color: 'var(--ink)' }}>{p.full_name}</h3>
        </Link>
        {p.country && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
            <MapPin size={12} /> {p.country}
          </p>
        )}

        <div className="mt-3 space-y-1.5 rounded-2xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{t('partners.teaches', 'Can teach')}</span>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>{p.native_language}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{t('partners.learning', 'Learning')}</span>
            <span className="inline-flex items-center gap-2 font-bold" style={{ color: 'var(--ink)' }}>
              {p.learning_language}
              {p.learning_level && (
                <span className="lp-tag lp-tag--accent" title={CEFR_NAMES[p.learning_level]}>
                  {p.learning_level}{CEFR_NAMES[p.learning_level] ? ` · ${t(`partners.cefr.${p.learning_level}`, CEFR_NAMES[p.learning_level])}` : ''}
                </span>
              )}
            </span>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          {p.bio || t('partnerProfile.noBio')}
        </p>

        {visibleAvailability.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleAvailability.slice(0, 2).map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => onSchedule(p, slot.id)}
                className="lp-tag lp-tag--accent2 cursor-pointer transition-transform hover:-translate-y-px hover:opacity-80"
                title={t('partners.scheduleThisTime', 'Schedule a session at this time')}
              >
                <Clock size={11} />
                {nextDateForDayOfWeek(slot.day_of_week, slot.start_time).toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short', day: 'numeric' })}
                {' '}{formatTime12(slot.start_time)}–{formatTime12(slot.end_time)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--ink-soft)' }}>
          <span className="inline-flex items-center gap-1">
            <CalendarCheck size={13} /> {t('partners.sessionsCount', { count: p.sessions_completed })}
          </span>
          {p.ratings_count > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#f5b301' }}>
              <Star size={13} fill="currentColor" /> {p.average_rating}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-2">
          {p.is_available_now ? (
            <button type="button" onClick={() => onCall(p)} className="lp-btn-primary w-full">
              <Phone size={15} /> {t('partners.callNow')}
            </button>
          ) : (
            <button type="button" onClick={() => onSchedule(p)} className="lp-btn-primary w-full">
              <CalendarPlus size={15} /> {t('partnerProfile.scheduleSession')}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onMessage(p)} className="lp-btn-secondary" style={{ padding: '0.55rem 0.5rem' }}>
              <MessageCircle size={14} /> {t('partnerProfile.message')}
            </button>
            {p.is_available_now ? (
              <button type="button" onClick={() => onSchedule(p)} className="lp-btn-secondary" style={{ padding: '0.55rem 0.5rem' }}>
                <CalendarPlus size={14} /> {t('partners.scheduleShort')}
              </button>
            ) : (
              <Link to={`/partners/${p.user_id}`} className="lp-btn-secondary" style={{ padding: '0.55rem 0.5rem' }}>
                <User size={14} /> {t('partners.viewProfile')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function Partners() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  // A person learns the one language set in their profile, so partners are always matched on it.
  const learningLanguage = user?.profile?.learning_language || ''
  const navigate = useNavigate()
  const [scheduleFor, setScheduleFor] = useState(null)
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibility, setVisibility] = useState('now')
  const [filters, setFilters] = useState({ type: 'lesson', lesson: '', date: '', time: '' })
  const myLessons = useMyLessons()
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [showMyTimes, setShowMyTimes] = useState(false)
  const [callTarget, setCallTarget] = useState(null)

  const load = () => {
    setLoading(true)
    const params = {}
    if (learningLanguage) params.language = learningLanguage
    if (filters.type === 'lesson' && filters.lesson) params.lesson = filters.lesson
    if (filters.date) params.day = dateToDayOfWeek(filters.date)
    client.get('/matching/partners/', { params })
      .then(({ data }) => setPartners(data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filters, learningLanguage, t])

  const slotMatchesTime = (slot) =>
    (slot.session_type || 'lesson') === filters.type
    && (!filters.time || (slot.start_time.slice(0, 5) <= filters.time && filters.time <= slot.end_time.slice(0, 5)))
  const withAvailability = partners.filter((p) => p.availability?.some(slotMatchesTime))
  const availableNow = partners.filter((p) => p.is_available_now)
  // Highest-rated first; unrated partners last. Array#sort is stable, so ties keep the
  // server order (exchange matches first).
  const byRating = (list) => [...list].sort((x, y) => (y.average_rating || 0) - (x.average_rating || 0))
  const visiblePartners = byRating(
    visibility === 'now' ? availableNow : visibility === 'scheduled' ? withAvailability : partners,
  )

  const handleCall = (p) => {
    setCallTarget({ id: p.user_id, name: p.full_name })
  }

  const handleMessage = async (p) => {
    const { data } = await client.post('/chat/conversations/start/', { partner_id: p.user_id })
    navigate(`/messages/${data.id}`)
  }

  const tabs = [
    ['now', t('partners.visibilityNow'), availableNow.length],
    ['scheduled', t('partners.visibilityScheduled'), withAvailability.length],
    ['all', t('partners.visibilityAll'), partners.length],
  ]
  const hasFilters = !!(filters.type !== 'lesson' || filters.lesson || filters.date || filters.time)

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="mx-auto max-w-6xl px-6 pb-8 pt-10">
          <div className="lp-animate-in flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: 'var(--ink)' }}>
                {t('partners.title')}
              </h1>
              <p className="mt-2 max-w-xl text-sm sm:text-base" style={{ color: 'var(--ink-soft)' }}>{t('partners.subtitle')}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <button type="button" onClick={() => setShowMyTimes(true)} className="lp-btn-secondary shrink-0">
                <CalendarCheck size={16} /> {t('partners.myAvailableTimes')}
              </button>
              <button type="button" onClick={() => setShowAvailabilityModal(true)} className="lp-btn-primary shrink-0">
                <CalendarPlus size={16} /> {t('partners.addAvailableTime')}
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="lp-card lp-animate-in lp-delay-1 mt-8" style={{ padding: '1.1rem 1.25rem' }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex rounded-full p-1" style={{ background: 'var(--surface-2)' }}>
                {tabs.map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setVisibility(key)
                      if (key !== 'scheduled') setFilters((f) => ({ ...f, date: '', time: '' }))
                    }}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all"
                    style={visibility === key
                      ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)', boxShadow: '0 6px 16px -8px rgb(20 184 166 / 0.9)' }
                      : { color: 'var(--ink-soft)' }}
                  >
                    {label}
                    {!loading && (
                      <span
                        className="rounded-full px-1.5 text-[11px] font-extrabold"
                        style={visibility === key ? { background: 'rgb(255 255 255 / 0.25)' } : { background: 'var(--line)' }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => setFilters({ type: 'lesson', lesson: '', date: '', time: '' })}
                  className="text-sm font-semibold hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  {t('partners.clearFilters')}
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div>
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{t('partners.sessionType', 'Session type')}</span>
                <div className="inline-flex h-11 items-center gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                  {[['lesson', BookOpen, t('partners.typeLesson', 'From the lessons')], ['conversation', MessagesSquare, t('partners.typeConversation', 'Free conversation')]].map(([value, Icon, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilters({ ...filters, type: value, lesson: '' })}
                      className="inline-flex h-full items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-bold transition-all"
                      style={filters.type === value
                        ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)', boxShadow: '0 6px 16px -8px rgb(20 184 166 / 0.9)' }
                        : { color: 'var(--ink-soft)' }}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              {filters.type === 'lesson' && (
                <FilterField label={t('partners.lessonFilter')} icon={GraduationCap} className="w-full sm:w-64">
                  <select value={filters.lesson} onChange={(e) => setFilters({ ...filters, lesson: e.target.value })} className={fieldClass} style={fieldStyle}>
                    <option value="">{t('partners.anyLesson')}</option>
                    {myLessons.map((l) => <option key={l.order} value={l.order} style={l.finished ? FINISHED_STYLE : undefined}>{lessonLabel(t, l)}</option>)}
                  </select>
                </FilterField>
              )}
              {visibility === 'scheduled' && (
                <>
                  <FilterField label={t('partners.date')} icon={CalendarCheck} className="w-full sm:w-52">
                    <input type="date" min={todayStr()} value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className={fieldClass} style={fieldStyle} />
                  </FilterField>
                  <FilterField label={t('partners.time')} icon={Clock} className="w-full sm:w-44">
                    <input type="time" value={filters.time} onChange={(e) => setFilters({ ...filters, time: e.target.value })} className={fieldClass} style={fieldStyle} />
                  </FilterField>
                </>
              )}
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
              <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
              {t('partners.lessonFilterNote')}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16 pt-6">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="lp-card animate-pulse" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="h-20" style={{ background: 'var(--surface-2)' }} />
                <div className="space-y-3 p-5">
                  <div className="-mt-12 h-[72px] w-[72px] rounded-full" style={{ background: 'var(--line)', border: '4px solid var(--surface)' }} />
                  <div className="h-4 w-2/3 rounded" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-3 w-1/2 rounded" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-10 rounded-full" style={{ background: 'var(--surface-2)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : visiblePartners.length === 0 ? (
          <div className="lp-card lp-animate-in mx-auto max-w-xl py-14 text-center">
            <span className="lp-icon-badge mx-auto mb-4 h-14 w-14">
              <Search size={22} />
            </span>
            <p className="mx-auto max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>
              {visibility === 'now' ? t('partners.emptyNow') : visibility === 'scheduled' ? t('partners.emptyAvailable') : t('partners.empty')}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {visibility !== 'all' && (
                <button type="button" onClick={() => setVisibility('all')} className="lp-btn-primary">
                  {t('partners.showAll')}
                </button>
              )}
              {hasFilters && (
                <button type="button" onClick={() => setFilters({ type: 'lesson', lesson: '', date: '', time: '' })} className="lp-btn-secondary">
                  {t('partners.clearFilters')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePartners.map((p, i) => (
              <PartnerCard
                key={p.user_id}
                p={p}
                i={i}
                t={t}
                i18n={i18n}
                filterDayOfWeek={filters.date ? dateToDayOfWeek(filters.date) : null}
                filterTime={filters.time}
                onMessage={handleMessage}
                onCall={handleCall}
                onSchedule={(partner, slotId) => setScheduleFor({ ...partner, slotId })}
              />
            ))}
          </div>
        )}

        {!loading && visiblePartners.length > 0 && visibility === 'scheduled' && withAvailability.length < partners.length && (
          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--ink-soft)' }}>
            <Sparkles size={13} style={{ color: 'var(--accent)' }} />
            {t('partners.moreWithAllHint', { count: partners.length - withAvailability.length })}
          </p>
        )}
      </div>

      {scheduleFor && (
        <SendSessionRequestModal
          lockedPartnerId={scheduleFor.user_id}
          initialSlotId={scheduleFor.slotId}
          onClose={() => setScheduleFor(null)}
          onSent={load}
        />
      )}

      {callTarget && <CallNowModal partnerId={callTarget.id} partnerName={callTarget.name} onClose={() => setCallTarget(null)} />}

      {showMyTimes && (
        <MyAvailabilityModal
          onClose={() => setShowMyTimes(false)}
          onChanged={load}
          onAdd={() => { setShowMyTimes(false); setShowAvailabilityModal(true) }}
        />
      )}

      {showAvailabilityModal && (
        <AddAvailabilityModal onClose={() => setShowAvailabilityModal(false)} onSaved={load} />
      )}
    </div>
  )
}
