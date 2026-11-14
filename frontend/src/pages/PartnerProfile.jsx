import CallNowModal from '../components/CallNowModal'
import { BookOpen, CalendarCheck, CalendarClock, CheckCircle2, Clock, MessageCircle, MessagesSquare, Phone, Play, Sparkles, Star, Video, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import ConversationThread from './ConversationThread'
import SendSessionRequestModal from '../components/SendSessionRequestModal'
import { bookableStartTimes, DAYS, formatTime12, isSlotExpiredToday, slotOccurrenceUtcInstant } from '../utils/availability'
import { resolveAvatarUrl } from '../utils/images'

function BookSlotModal({ slot, partner, userId, onClose, onBooked }) {
  const { t, i18n } = useTranslation()
  const options = bookableStartTimes(slot)
  const [selected, setSelected] = useState(options[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const dayLabel = slot.is_recurring
    ? t(`profile.days.${DAYS.find((d) => d.value === slot.day_of_week)?.key}`)
    : new Date(`${slot.specific_date}T00:00:00`).toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short', month: 'short', day: 'numeric' })

  const handleConfirm = async () => {
    setError('')
    setSubmitting(true)
    try {
      const utcInstant = slotOccurrenceUtcInstant(slot, selected, partner.timezone)
      await client.post('/sessions/', {
        partner_id: userId,
        scheduled_time: utcInstant.toISOString(),
        duration_minutes: 40,
        auto_confirm: true,
      })
      setDone(true)
      onBooked?.()
    } catch (err) {
      const data = err.response?.data
      setError(data ? Object.values(data).flat().join(' ') : t('partnerProfile.bookError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 overflow-y-auto" style={{ background: 'color-mix(in srgb, black 45%, transparent)' }}>
      <div className="lp-surface w-full max-w-sm p-6 lp-animate-in-scale my-auto" style={{ boxShadow: 'var(--shadow-card-hover)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="lp-icon-badge h-9 w-9">
              <CalendarClock size={16} />
            </span>
            <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{t('partnerProfile.bookSession')}</h2>
          </div>
          <button type="button" onClick={onClose} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="py-4 text-center lp-animate-in">
            <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'var(--accent-2)' }} />
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--ink)' }}>{t('partnerProfile.requestSent')}</p>
            <button type="button" onClick={onClose} className="lp-btn-primary">{t('common.done')}</button>
          </div>
        ) : (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
              {t('partnerProfile.bookSubtitle', { name: partner.full_name, day: dayLabel, start: formatTime12(slot.start_time), end: formatTime12(slot.end_time) })}
            </p>

            {options.length > 1 ? (
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-soft)' }}>{t('partnerProfile.chooseStartTime')}</p>
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelected(opt)}
                      className="px-3.5 py-2 text-sm font-semibold transition-all"
                      style={{
                        borderRadius: 'var(--radius-pill)',
                        background: selected === opt ? 'var(--gradient-brand)' : 'var(--surface-2)',
                        color: selected === opt ? 'var(--accent-ink)' : 'var(--ink-soft)',
                      }}
                    >
                      {formatTime12(opt)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 mb-5 px-4 py-3 text-sm font-semibold"
                style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-card)', color: 'var(--ink)' }}
              >
                <Clock size={15} style={{ color: 'var(--accent)' }} /> {formatTime12(selected)} ({t('schedule.minutesShort', { count: 40 })})
              </div>
            )}

            {error && <p className="text-sm mb-3" style={{ color: '#c1443d' }}>{error}</p>}
            <button type="button" onClick={handleConfirm} disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50">
              {submitting ? t('schedule.submitting') : t('partnerProfile.sendRequest')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PartnerProfile() {
  const { t, i18n } = useTranslation()
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [partner, setPartner] = useState(null)
  const [myNotes, setMyNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingSlot, setBookingSlot] = useState(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [chatId, setChatId] = useState(null)

  const loadPartner = () => client.get(`/matching/partners/${userId}/`).then(({ data }) => setPartner(data))

  useEffect(() => {
    setLoading(true)
    setVideoPlaying(false)
    setChatId(null)
    loadPartner().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Notes I wrote during past sessions with this person (private to me).
  useEffect(() => {
    client.get('/sessions/notes/', { params: { with: userId } })
      .then(({ data }) => setMyNotes(data))
      .catch(() => setMyNotes([]))
  }, [userId])

  const handleMessage = async () => {
    const { data } = await client.post('/chat/conversations/start/', { partner_id: userId })
    setChatId(data.id)
  }

  const [callOpen, setCallOpen] = useState(false)
  const handleCall = () => {
    setCallOpen(true)
  }

  if (loading) return <div className="p-16 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('partnerProfile.loading')}</div>
  if (!partner) return <div className="p-16 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('partnerProfile.notFound')}</div>

  const visibleAvailability = partner.availability?.filter((slot) => !isSlotExpiredToday(slot)) || []

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      {callOpen && <CallNowModal partnerId={userId} partnerName={partner.full_name} onClose={() => setCallOpen(false)} />}

      {/* Banner: who they are + what you can do */}
      <div className="lp-hero-bg">
        <div className="mx-auto max-w-5xl px-6 pb-10 pt-10 lp-animate-in">
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative shrink-0">
              <img
                src={resolveAvatarUrl(partner.avatar, partner.user_id, 280)}
                alt=""
                className="lp-avatar h-28 w-28 object-cover"
                style={{ border: '4px solid #fff' }}
              />
              {partner.is_available_now && (
                <span className="absolute bottom-1 end-1 h-5 w-5 rounded-full" style={{ background: '#22c55e', border: '3px solid #fff' }} title={t('partners.visibilityNow')} />
              )}
              {partner.intro_video && (
                <span
                  className="absolute -bottom-1 -start-1 flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: '#0b1a2c', color: '#fff', border: '3px solid #fff' }}
                  title={t('partnerProfile.introVideo')}
                >
                  <Video size={13} />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 basis-64">
              <h1 className="lp-serif text-[2rem] leading-tight sm:text-[2.5rem]" style={{ color: 'var(--ink)' }}>{partner.full_name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full px-3 py-1 font-semibold" style={{ background: '#0b1a2c', color: '#fff' }}>
                  {partner.match_type === 'exchange' ? t('partnerProfile.exchangeMatch') : t('partnerProfile.peerPractice')}
                </span>
                {partner.country && (
                  <span className="rounded-full px-3 py-1 font-medium" style={{ background: 'rgb(255 255 255 / 0.7)', color: '#0b1a2c' }}>{partner.country}</span>
                )}
                {partner.age != null && (
                  <span className="rounded-full px-3 py-1 font-medium" style={{ background: 'rgb(255 255 255 / 0.7)', color: '#0b1a2c' }}>{t('partnerProfile.ageYears', { age: partner.age })}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button onClick={handleMessage} className="inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ background: '#0b1a2c', color: '#fff', borderRadius: 'var(--radius-pill)' }}>
                <MessageCircle size={16} /> {t('partnerProfile.message')}
              </button>
              {partner.is_available_now && (
                <button onClick={handleCall} className="inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ background: '#7fd8c3', color: '#0b1a2c', borderRadius: 'var(--radius-pill)' }}>
                  <Phone size={16} /> {t('partners.callNow')}
                </button>
              )}
              {visibleAvailability.length > 0 && (
                <button onClick={() => setShowRequestModal(true)} className="inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ background: '#fff', color: '#0b1a2c', borderRadius: 'var(--radius-pill)' }}>
                  <CalendarClock size={16} /> {t('partnerProfile.scheduleSession')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Main column */}
          <div className="min-w-0 space-y-8 lp-animate-in">
            <div>
              <h2 className="lp-serif mb-3 text-2xl">{t('partnerProfile.introVideo')}</h2>
              {partner.intro_video ? (
                <div className="relative overflow-hidden" style={{ background: '#0b1a2c', borderRadius: 'var(--radius-card)' }}>
                  <video
                    src={partner.intro_video}
                    controls={videoPlaying}
                    onPlay={() => setVideoPlaying(true)}
                    className="w-full max-h-96"
                  />
                  {!videoPlaying && (
                    <button
                      type="button"
                      onClick={(e) => { e.currentTarget.previousElementSibling?.play(); setVideoPlaying(true) }}
                      className="absolute inset-0 flex items-center justify-center group"
                      style={{ background: 'rgb(11 26 44 / 0.25)' }}
                      aria-label={t('partnerProfile.introVideo')}
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110" style={{ background: '#7fd8c3', color: '#0b1a2c' }}>
                        <Play size={22} fill="currentColor" />
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 px-5 py-6 text-sm" style={{ background: '#d6def5', color: '#17191d', borderRadius: 'var(--radius-card)' }}>
                  <Video size={20} className="shrink-0" style={{ opacity: 0.7 }} />
                  {t('partnerProfile.noVideo')}
                </div>
              )}
            </div>

            <div>
              <h2 className="lp-serif mb-3 text-2xl">{t('partnerProfile.bio')}</h2>
              <p className="text-base leading-relaxed" style={{ color: 'var(--ink)' }}>
                {partner.bio || t('partnerProfile.noBio')}
              </p>
            </div>

            <div>
              <h2 className="lp-serif mb-3 text-2xl">{t('partnerProfile.learningGoals')}</h2>
              <p className="text-base leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                {partner.learning_goals || t('partnerProfile.noLearningGoals')}
              </p>
            </div>

            {myNotes.length > 0 && (
              <div>
                <h2 className="lp-serif mb-1 text-2xl">{t('partnerProfile.myNotes')}</h2>
                <p className="mb-3 text-xs" style={{ color: 'var(--ink-soft)' }}>{t('partnerProfile.myNotesHint')}</p>
                <div className="grid gap-3">
                  {myNotes.map((n) => (
                    <div key={n.session_id} className="p-4" style={{ background: '#f4d9cf', color: '#17191d', borderRadius: 'var(--radius-card)' }}>
                      <p className="mb-1.5 text-xs" style={{ opacity: 0.65 }}>
                        {new Date(n.scheduled_time).toLocaleDateString(i18n.resolvedLanguage, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="lp-serif mb-3 text-2xl">{t('partnerProfile.availability')}</h2>
              {visibleAvailability.length > 0 ? (
                <>
                  <p className="mb-3 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-soft)' }}>
                    <Sparkles size={12} /> {t('partnerProfile.availabilityBookHint')}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {visibleAvailability.map((slot, i) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setBookingSlot(slot)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                        style={{ borderRadius: 'var(--radius-pill)', background: ['#c9ece2', '#d6def5', '#f4d9cf'][i % 3], color: '#17191d' }}
                      >
                        <CalendarClock size={13} />
                        {slot.is_recurring
                          ? t(`profile.days.${DAYS.find((d) => d.value === slot.day_of_week)?.key}`)
                          : new Date(`${slot.specific_date}T00:00:00`).toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' '}{formatTime12(slot.start_time)}–{formatTime12(slot.end_time)}
                        <span className="opacity-50">·</span>
                        {slot.session_type === 'conversation' ? <MessagesSquare size={13} /> : <BookOpen size={13} />}
                        {slot.session_type === 'conversation'
                          ? t('partners.typeConversation', 'Free conversation')
                          : `${t('partners.typeLesson', 'From the lessons')}${slot.lesson ? ` · ${t('partners.lessonOption', { n: slot.lesson })}` : ''}`}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{t('partnerProfile.noAvailability')}</p>
              )}
            </div>
          </div>

          {/* Side column: languages + stats */}
          <aside className="space-y-4 lp-animate-in lp-delay-1 lg:sticky lg:top-24 lg:self-start">
            <div className="p-6" style={{ background: '#d6def5', color: '#17191d', borderRadius: 'var(--radius-card)' }}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ opacity: 0.6 }}>{t('partners.teaches', 'Can teach')}</p>
              <p className="lp-serif text-xl">{partner.native_language} <span className="text-sm" style={{ opacity: 0.65 }}>· {t('levels.native')}</span></p>
              <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-widest" style={{ opacity: 0.6 }}>{t('partners.learning', 'Learning')}</p>
              <p className="lp-serif text-xl">{partner.learning_language} <span className="text-sm" style={{ opacity: 0.65 }}>· {t(`levels.${partner.proficiency_level}`, partner.proficiency_level)}</span></p>
            </div>
            <div className="flex items-center gap-4 p-5" style={{ background: '#c9ece2', color: '#17191d', borderRadius: 'var(--radius-card)' }}>
              <CalendarCheck size={30} strokeWidth={1.5} style={{ opacity: 0.7 }} />
              <div>
                <p className="lp-serif text-2xl leading-none">{partner.sessions_completed}</p>
                <p className="mt-1 text-xs" style={{ opacity: 0.7 }}>{t('partnerProfile.sessionsLabel')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5" style={{ background: '#f4d9cf', color: '#17191d', borderRadius: 'var(--radius-card)' }}>
              <Star size={30} strokeWidth={1.5} style={{ opacity: 0.7 }} />
              <div>
                <p className="lp-serif text-2xl leading-none">{partner.ratings_count > 0 ? partner.average_rating : '—'}</p>
                <p className="mt-1 text-xs" style={{ opacity: 0.7 }}>
                  {partner.ratings_count > 0 ? t('partnerProfile.ratingsLabel', { count: partner.ratings_count }) : t('partnerProfile.noRatingsYet')}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {bookingSlot && (
        <BookSlotModal
          slot={bookingSlot}
          partner={partner}
          userId={userId}
          onClose={() => setBookingSlot(null)}
          onBooked={loadPartner}
        />
      )}

      {showRequestModal && (
        <SendSessionRequestModal
          lockedPartnerId={userId}
          onClose={() => setShowRequestModal(false)}
          onSent={loadPartner}
        />
      )}
      {chatId && (
        <div className="fixed bottom-4 end-4 z-40 h-[32rem] max-h-[calc(100vh-6rem)] w-[22rem] max-w-[calc(100vw-2rem)]">
          <button
            type="button"
            onClick={() => setChatId(null)}
            className="lp-surface absolute -top-3 -end-3 z-10 flex h-8 w-8 items-center justify-center rounded-full hover:opacity-80"
            style={{ color: 'var(--ink)', boxShadow: 'var(--shadow-card-hover)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <div className="lp-surface lp-animate-in-scale h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-card-hover)' }}>
            <ConversationThread conversationId={chatId} partner={{ id: partner.user_id, full_name: partner.full_name }} />
          </div>
        </div>
      )}
    </div>
  )
}
