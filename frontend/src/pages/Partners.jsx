import { ArrowRight, CalendarCheck, CalendarPlus, CheckCircle2, Clock, GraduationCap, Globe2, Info, MapPin, MessageCircle, Phone, Plus, Search, Sparkles, Star, Trash2, User, Video, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import ModalShell, { Chip, ModalField, Switch, localDateString, modalInputClass, modalInputStyle } from '../components/ModalShell'
import SendSessionRequestModal from '../components/SendSessionRequestModal'
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
  const profileLang = user?.profile
  const speakOptions = [...new Set([profileLang?.native_language, ...(profileLang?.spoken_languages || [])].filter(Boolean))]
  const learnOptions = profileLang?.learning_languages?.length
    ? profileLang.learning_languages
    : [profileLang?.learning_language].filter(Boolean)
  const [slot, setSlot] = useState(() => {
    const start = nowTimeStr()
    return {
      date: todayStr(),
      start_time: start,
      end_time: timeStrPlusMinutes(start, 40),
      weekly: true,
      native_language: speakOptions[0] || '',
      learning_language: learnOptions[0] || '',
    }
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [mySlots, setMySlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(true)

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

  // The length chips set the end time from the start time
  const lengthOf = () => {
    const [sh, sm] = slot.start_time.split(':').map(Number)
    const [eh, em] = slot.end_time.split(':').map(Number)
    return (eh * 60 + em) - (sh * 60 + sm)
  }
  const setLength = (minutes) => setSlot((s) => ({ ...s, end_time: timeStrPlusMinutes(s.start_time, minutes) }))
  const setStart = (start_time) => setSlot((s) => ({ ...s, start_time, end_time: timeStrPlusMinutes(start_time, Math.max(lengthOf(), 30) || 40) }))

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
      if (slot.learning_language && slot.learning_language !== profile?.learning_language) {
        await client.patch('/auth/me/', { profile: { learning_language: slot.learning_language } })
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

  const dayChips = [0, 1, 2].map((offset) => {
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
        <button type="submit" form="availability-form" disabled={saving} className="lp-btn-primary w-full disabled:opacity-50">
          {saving ? t('profile.saving') : t('partners.addAvailableTime')}
        </button>
      )}
    >
      {!slotsLoading && mySlots.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{t('partners.myAvailableTimes')}</p>
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {mySlots.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 rounded-full py-1.5 ps-3.5 pe-1.5 text-xs font-semibold"
                style={{ background: 'color-mix(in srgb, var(--accent) 14%, var(--surface))', color: 'var(--ink)' }}
              >
                <span style={{ color: 'var(--accent)' }}>{formatSlotDate(s)}</span>
                {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                {!s.is_recurring && <span style={{ color: 'var(--ink-soft)' }}>· {t('partners.oneTime')}</span>}
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,#f87171_22%,transparent)]"
                  style={{ color: '#f87171' }}
                  aria-label={t('profile.removeSlot')}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

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
          {(speakOptions.length > 1 || learnOptions.length > 1) && (
            <div className="grid grid-cols-2 gap-4">
              {speakOptions.length > 1 && (
                <ModalField label={t('auth.register.iSpeak')} icon={Globe2}>
                  <select value={slot.native_language} onChange={(e) => setSlot({ ...slot, native_language: e.target.value })} className={`${modalInputClass} ps-11`} style={modalInputStyle}>
                    {speakOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </ModalField>
              )}
              {learnOptions.length > 1 && (
                <ModalField label={t('auth.register.iAmLearning')} icon={GraduationCap}>
                  <select value={slot.learning_language} onChange={(e) => setSlot({ ...slot, learning_language: e.target.value })} className={`${modalInputClass} ps-11`} style={modalInputStyle}>
                    {learnOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </ModalField>
              )}
            </div>
          )}

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
                  value={slot.end_time}
                  onChange={(e) => setSlot({ ...slot, end_time: e.target.value })}
                  className={`${modalInputClass} ps-11`}
                  style={modalInputStyle}
                />
              </ModalField>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--ink-soft)' }}>{t('modal.length')}</span>
              {[30, 40, 60, 90].map((m) => (
                <Chip key={m} active={lengthOf() === m} onClick={() => setLength(m)}>{t('schedule.minutesShort', { count: m })}</Chip>
              ))}
            </div>
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

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="lp-tag">{p.native_language}</span>
          <ArrowRight size={13} className="rtl:rotate-180" style={{ color: 'var(--ink-soft)' }} />
          <span className="lp-tag lp-tag--accent">
            {p.learning_language} · {t(`levels.${p.proficiency_level}`, p.proficiency_level)}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          {p.bio || t('partnerProfile.noBio')}
        </p>

        {visibleAvailability.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleAvailability.slice(0, 2).map((slot) => (
              <span key={slot.id} className="lp-tag lp-tag--accent2">
                <Clock size={11} />
                {nextDateForDayOfWeek(slot.day_of_week, slot.start_time).toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short', day: 'numeric' })}
                {' '}{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
              </span>
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
  const myLearning = user?.profile?.learning_languages?.length
    ? user.profile.learning_languages
    : (user?.profile?.learning_language ? [user.profile.learning_language] : [])
  const navigate = useNavigate()
  const [scheduleFor, setScheduleFor] = useState(null)
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibility, setVisibility] = useState('now')
  const [filters, setFilters] = useState({ learning: '', lesson: '', date: '', time: '' })
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [lessonCount, setLessonCount] = useState(12)

  // The lesson list runs up to the highest lesson number in the course files.
  useEffect(() => {
    client.get('/courses/materials/')
      .then(({ data }) => setLessonCount(Math.max(1, ...data.map((m) => m.order || 0))))
      .catch(() => {})
  }, [])

  const load = () => {
    setLoading(true)
    const params = {}
    if (filters.learning) params.language = filters.learning
    if (filters.lesson) params.lesson = filters.lesson
    if (filters.date) params.day = dateToDayOfWeek(filters.date)
    client.get('/matching/partners/', { params })
      .then(({ data }) => setPartners(data))
      .finally(() => setLoading(false))
  }

  // With a single learning language in the profile, pre-select it in the filter.
  useEffect(() => {
    if (myLearning.length === 1) setFilters((f) => (f.learning ? f : { ...f, learning: myLearning[0] }))
  }, [myLearning.join('|')])

  useEffect(load, [filters, t])

  const slotMatchesTime = (slot) =>
    !filters.time || (slot.start_time.slice(0, 5) <= filters.time && filters.time <= slot.end_time.slice(0, 5))
  const withAvailability = partners.filter((p) => p.availability?.some(slotMatchesTime))
  const availableNow = partners.filter((p) => p.is_available_now)
  // Highest-rated first; unrated partners last. Array#sort is stable, so ties keep the
  // server order (exchange matches first).
  const byRating = (list) => [...list].sort((x, y) => (y.average_rating || 0) - (x.average_rating || 0))
  const visiblePartners = byRating(
    visibility === 'now' ? availableNow : visibility === 'scheduled' ? withAvailability : partners,
  )

  const handleCall = async (p) => {
    try {
      const { data } = await client.post('/calls/ring/', { partner_id: p.user_id, notify: false })
      navigate(`/call/${data.room_id}?from=${user.id}&name=${encodeURIComponent(user.full_name)}`)
    } catch {
      window.alert(t('call.ringError'))
    }
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
  const hasFilters = !!(filters.learning || filters.lesson || filters.date || filters.time)

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
            <button type="button" onClick={() => setShowAvailabilityModal(true)} className="lp-btn-primary shrink-0">
              <CalendarPlus size={16} /> {t('partners.addAvailableTime')}
            </button>
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
                  onClick={() => setFilters({ learning: '', lesson: '', date: '', time: '' })}
                  className="text-sm font-semibold hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  {t('partners.clearFilters')}
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterField label={t('auth.register.iAmLearning')} icon={Globe2}>
                <select value={filters.learning} onChange={(e) => setFilters({ ...filters, learning: e.target.value })} className={fieldClass} style={fieldStyle}>
                  <option value="">{t('partners.anyLanguage')}</option>
                  {myLearning.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </FilterField>
              <FilterField label={t('partners.lessonFilter')} icon={GraduationCap}>
                <select value={filters.lesson} onChange={(e) => setFilters({ ...filters, lesson: e.target.value })} className={fieldClass} style={fieldStyle}>
                  <option value="">{t('partners.anyLesson')}</option>
                  {Array.from({ length: lessonCount }, (_, n) => n + 1).map((n) => (
                    <option key={n} value={n}>{t('partners.lessonOption', { n })}</option>
                  ))}
                </select>
              </FilterField>
              {visibility === 'scheduled' && (
                <>
                  <FilterField label={t('partners.date')} icon={CalendarCheck}>
                    <input type="date" min={todayStr()} value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className={fieldClass} style={fieldStyle} />
                  </FilterField>
                  <FilterField label={t('partners.time')} icon={Clock}>
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
                <button type="button" onClick={() => setFilters({ learning: '', lesson: '', date: '', time: '' })} className="lp-btn-secondary">
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
                onSchedule={(partner) => setScheduleFor(partner)}
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
          onClose={() => setScheduleFor(null)}
          onSent={load}
        />
      )}

      {showAvailabilityModal && (
        <AddAvailabilityModal onClose={() => setShowAvailabilityModal(false)} onSaved={load} />
      )}
    </div>
  )
}
