import CallNowModal from '../components/CallNowModal'
import { BookOpen, CalendarCheck, CalendarClock, CheckCircle2, Clock, MessageCircle, MessagesSquare, Phone, Play, Sparkles, Star, Video, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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

function StatChip({ icon: Icon, value, label, accent }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-base font-bold leading-none" style={{ color: 'var(--ink)' }}>{value}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-soft)' }}>{label}</p>
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

  const accent = partner.match_type === 'exchange' ? 'var(--accent)' : 'var(--accent-2)'
  const visibleAvailability = partner.availability?.filter((slot) => !isSlotExpiredToday(slot)) || []

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {callOpen && <CallNowModal partnerId={userId} partnerName={partner.full_name} onClose={() => setCallOpen(false)} />}
      <div
        className="absolute -top-20 -end-20 h-80 w-80 rounded-full pointer-events-none lp-blob-drift"
        style={{ background: 'var(--accent)', opacity: 0.14, filter: 'blur(80px)' }}
      />
      <div
        className="absolute top-[380px] -start-24 h-80 w-80 rounded-full pointer-events-none lp-blob-drift"
        style={{ background: 'var(--accent-2)', opacity: 0.14, filter: 'blur(80px)', animationDelay: '3s' }}
      />

      <div className="max-w-4xl mx-auto px-6 py-14 relative">
        <div className="grid lg:grid-cols-[280px_1fr] gap-12">
          {/* Left: visual identity + actions */}
          <div className="lp-animate-in lg:sticky lg:top-24 lg:self-start">
            <div className="relative w-fit mx-auto lg:mx-0 mb-5">
              <span
                className="absolute -inset-3 rounded-full pointer-events-none"
                style={{ background: accent, filter: 'blur(30px)', opacity: 0.35 }}
              />
              <img
                src={resolveAvatarUrl(partner.avatar, partner.user_id, 280)}
                alt=""
                className="relative lp-avatar lp-gradient-ring h-36 w-36 object-cover"
                style={{ border: '4px solid var(--bg)' }}
              />
              {partner.intro_video && (
                <span
                  className="absolute bottom-1 end-1 flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: 'var(--gradient-brand)', color: 'var(--accent-ink)', border: '3px solid var(--bg)' }}
                  title={t('partnerProfile.introVideo')}
                >
                  <Video size={15} />
                </span>
              )}
            </div>

            <div className="text-center lg:text-start mb-6">
              <h1 className="font-display text-2xl font-bold tracking-tight lp-gradient-text">{partner.full_name}</h1>
              <span className="inline-flex mt-1.5 text-xs font-semibold" style={{ color: accent }}>
                {partner.match_type === 'exchange' ? t('partnerProfile.exchangeMatch') : t('partnerProfile.peerPractice')}
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <StatChip icon={CalendarCheck} value={partner.sessions_completed} label={t('partnerProfile.sessionsLabel')} accent="var(--accent)" />
              <StatChip
                icon={Star}
                value={partner.ratings_count > 0 ? partner.average_rating : '—'}
                label={partner.ratings_count > 0 ? t('partnerProfile.ratingsLabel', { count: partner.ratings_count }) : t('partnerProfile.noRatingsYet')}
                accent="#c98a1c"
              />
            </div>

            <div className="flex lg:flex-col gap-2.5">
              <button onClick={handleMessage} className="lp-btn-primary flex-1 lg:w-full justify-center">
                <MessageCircle size={16} /> {t('partnerProfile.message')}
              </button>
              {partner.is_available_now && (
                <button onClick={handleCall} className="lp-btn-primary flex-1 lg:w-full justify-center">
                  <Phone size={16} /> {t('partners.callNow')}
                </button>
              )}
              <button onClick={() => setShowRequestModal(true)} className="lp-btn-secondary flex-1 lg:w-full justify-center">
                <CalendarClock size={16} /> {t('partnerProfile.scheduleSession')}
              </button>
            </div>
          </div>

          {/* Right: story + details */}
          <div className="lp-animate-in lp-delay-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <Trans
                i18nKey="partnerProfile.speaksLearning"
                values={{
                  native: `${partner.native_language} · ${t('levels.native')}`,
                  learning: `${partner.learning_language} · ${t(`levels.${partner.proficiency_level}`, partner.proficiency_level)}`,
                }}
                components={{
                  native: (
                    <span
                      className="px-2.5 py-1 text-xs font-semibold"
                      style={{ borderRadius: 'var(--radius-pill)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                    />
                  ),
                  learning: (
                    <span
                      className="px-2.5 py-1 text-xs font-semibold"
                      style={{ borderRadius: 'var(--radius-pill)', background: 'color-mix(in srgb, var(--accent-2) 14%, transparent)', color: 'var(--accent-2)' }}
                    />
                  ),
                }}
              />
              {partner.age != null && <span className="lp-tag">{t('partnerProfile.ageYears', { age: partner.age })}</span>}
            </div>

            <div className="mb-8">
              <p className="lp-eyebrow mb-2">{t('partnerProfile.introVideo')}</p>
              {partner.intro_video ? (
                <div className="relative rounded-3xl overflow-hidden" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-card)' }}>
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
                      style={{ background: 'color-mix(in srgb, black 15%, transparent)' }}
                      aria-label={t('partnerProfile.introVideo')}
                    >
                      <span
                        className="flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                        style={{ background: 'var(--gradient-brand)', color: 'var(--accent-ink)', boxShadow: '0 8px 24px -8px rgb(0 0 0 / 0.4)' }}
                      >
                        <Play size={22} fill="currentColor" />
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 px-4 py-6 rounded-2xl text-sm"
                  style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}
                >
                  <Video size={16} className="shrink-0" />
                  {t('partnerProfile.noVideo')}
                </div>
              )}
            </div>

            <div className="mb-8">
              <p className="lp-eyebrow mb-2">{t('partnerProfile.bio')}</p>
              <p className="text-base leading-relaxed" style={{ color: 'var(--ink)' }}>
                {partner.bio || t('partnerProfile.noBio')}
              </p>
            </div>

            <div className="mb-8 flex items-start gap-3">
              <div>
                <p className="lp-eyebrow mb-1">{t('partnerProfile.learningGoals')}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                  {partner.learning_goals || t('partnerProfile.noLearningGoals')}
                </p>
              </div>
            </div>

            {myNotes.length > 0 && (
              <div className="mb-8">
                <p className="lp-eyebrow mb-1">{t('partnerProfile.myNotes')}</p>
                <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>{t('partnerProfile.myNotesHint')}</p>
                <div className="grid gap-3">
                  {myNotes.map((n) => (
                    <div key={n.session_id} className="lp-surface p-4">
                      <p className="text-xs mb-1.5" style={{ color: 'var(--ink-soft)' }}>
                        {new Date(n.scheduled_time).toLocaleDateString(i18n.resolvedLanguage, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--ink)' }}>{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="lp-eyebrow mb-2">{t('partnerProfile.availability')}</p>
              {visibleAvailability.length > 0 ? (
                <>
                  <p className="text-xs mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--ink-soft)' }}>
                    <Sparkles size={12} style={{ color: 'var(--accent)' }} /> {t('partnerProfile.availabilityBookHint')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visibleAvailability.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setBookingSlot(slot)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5"
                        style={{ borderRadius: 'var(--radius-pill)', background: 'var(--gradient-brand)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-card)' }}
                      >
                        <CalendarClock size={13} />
                        {slot.is_recurring
                          ? t(`profile.days.${DAYS.find((d) => d.value === slot.day_of_week)?.key}`)
                          : new Date(`${slot.specific_date}T00:00:00`).toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' '}{formatTime12(slot.start_time)}–{formatTime12(slot.end_time)}
                        <span className="opacity-60">·</span>
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
