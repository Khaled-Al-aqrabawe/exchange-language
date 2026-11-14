import CallNowModal from '../components/CallNowModal'
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Download,
  FileText,
  Lightbulb,
  Phone,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import client from '../api/client'
import ModalShell from '../components/ModalShell'
import { useMyLessons } from '../components/SessionTypePicker'
import { useAuth } from '../context/AuthContext'
import { downloadText } from '../utils/downloadFile'
import { downloadSummaryPdf } from '../utils/summaryPdf'
import { resolveAvatarUrl } from '../utils/images'

const dayOfYear = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now - start) / 86400000)
}

function QuickAction({ to, icon: Icon, title, subtitle, bg, delay }) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5 lp-animate-in lp-delay-${delay}`}
      style={{ background: bg, color: '#17191d', borderRadius: 'var(--radius-card)' }}
    >
      <Icon size={32} strokeWidth={1.5} className="shrink-0" style={{ opacity: 0.7 }} />
      <div className="min-w-0 flex-1">
        <h3 className="lp-serif text-lg">{title}</h3>
        <p className="mt-0.5 text-xs" style={{ opacity: 0.72 }}>{subtitle}</p>
      </div>
      <ArrowRight size={18} className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" style={{ opacity: 0.6 }} />
    </Link>
  )
}

function SectionHeader({ title, to }) {
  const { t } = useTranslation()
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="lp-serif text-2xl" style={{ color: 'var(--ink)' }}>{title}</h2>
      <Link to={to} className="text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>{t('common.seeAll')}</Link>
    </div>
  )
}

// Where the learner is in the course: finished lessons out of all lessons at their level.
function CourseProgress({ lessons, language, level }) {
  const { t } = useTranslation()
  if (!lessons.length) return null
  const done = lessons.filter((l) => l.finished).length
  const total = lessons.length
  const percent = Math.round((done / total) * 100)
  const next = lessons.find((l) => !l.finished)

  return (
    <Link
      to={`/materials?language=${encodeURIComponent(language || '')}&level=${encodeURIComponent(level || '')}`}
      className="lp-card lp-card--hover lp-animate-in lp-delay-2 mb-6 flex items-center gap-3.5"
      style={{ padding: '0.7rem 1rem' }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold" style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
        {percent}%
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>
          <span className="truncate">{[language, level].filter(Boolean).join(' · ')}</span>
          <span className="shrink-0" style={{ color: 'var(--accent)' }}>{done}/{total}</span>
        </p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
          <div className="h-full rounded-full" style={{ width: `${percent}%`, background: 'var(--gradient-brand)' }} />
        </div>
      </div>
      <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold sm:flex" style={{ color: 'var(--accent)' }}>
        {next
          ? t('dashboard.continueLesson', { n: next.order, defaultValue: 'Continue · Lesson {{n}}' })
          : t('dashboard.courseDone', 'Course completed 🎉')}
        <ArrowRight size={14} className="rtl:rotate-180" />
      </span>
    </Link>
  )
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Arriving from a finished call: offer the session summary in a box over the home page.
  const [summaryId, setSummaryId] = useState(location.state?.summarySessionId || null)
  const [summaryBusy, setSummaryBusy] = useState(false)

  const closeSummary = () => {
    setSummaryId(null)
    navigate('/home', { replace: true, state: null })
  }

  const downloadSummary = async () => {
    setSummaryBusy(true)
    try {
      const { data } = await client.get(`/sessions/${summaryId}/summary/`)
      await downloadSummaryPdf(`session-summary-${summaryId}.pdf`, data, t, i18n.resolvedLanguage)
    } finally {
      setSummaryBusy(false)
      closeSummary()
    }
  }

  const profile = user?.profile
  const myLessons = useMyLessons()

  const [sessions, setSessions] = useState([])
  const [partners, setPartners] = useState([])

  useEffect(() => {
    Promise.all([
      client.get('/sessions/').then(({ data }) => data).catch(() => []),
      client.get('/matching/partners/', { params: profile?.learning_language ? { language: profile.learning_language } : {} }).then(({ data }) => data).catch(() => []),
    ]).then(([s, p]) => {
      setSessions(s)
      setPartners(p)
    })
  }, [])

  const tips = t('dashboard.tips', { returnObjects: true })
  const tipList = Array.isArray(tips) ? tips : []
  const tipOfDay = tipList.length ? tipList[dayOfYear() % tipList.length] : ''

  const otherParty = (session) => (session.host.id === user?.id ? session.partner : session.host)

  const upcoming = sessions
    .filter((s) => s.status === 'confirmed' && new Date(s.scheduled_time) > new Date())
    .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))

  const [callTarget, setCallTarget] = useState(null)
  const handleCall = (p) => {
    setCallTarget({ id: p.user_id, name: p.full_name })
  }

  const availableNow = partners.filter((p) => p.is_available_now).slice(0, 4)
  const upcomingSessions = upcoming.slice(0, 3)

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      {callTarget && <CallNowModal partnerId={callTarget.id} partnerName={callTarget.name} onClose={() => setCallTarget(null)} />}
      {summaryId && (
        <ModalShell
          icon={FileText}
          title={t('summary.readyTitle')}
          subtitle={t('summary.readyBody')}
          onClose={closeSummary}
          footer={(
            <div className="flex items-center gap-3">
              <button type="button" onClick={closeSummary} className="lp-btn-secondary shrink-0">{t('summary.close')}</button>
              <button type="button" onClick={downloadSummary} disabled={summaryBusy} className="lp-btn-primary flex-1 disabled:opacity-50">
                <Download size={16} /> {t('summary.download')}
              </button>
            </div>
          )}
        >
        </ModalShell>
      )}
      <div style={{ background: 'linear-gradient(120deg, #c3d0f2 0%, #b9d6ea 55%, #aee2d3 100%)', color: '#0b1a2c', '--ink': '#0b1a2c' }}>
        <div className="mx-auto max-w-6xl px-6 pb-12 pt-10">
          {/* Greeting */}
          <div className="lp-animate-in flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <img
                src={resolveAvatarUrl(profile?.avatar, user?.id, 128)}
                alt=""
                className="lp-avatar h-16 w-16 shrink-0 object-cover"
                style={{ border: '3px solid #fff' }}
              />
              <h1 className="lp-serif text-[2.25rem] leading-tight sm:text-[3rem]" style={{ color: '#0b1a2c' }}>
              {(() => {
                const h = new Date().getHours()
                const part = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'
                return user?.first_name
                  ? t(`dashboard.greeting${part}WithName`, { name: user.first_name })
                  : t(`dashboard.greeting${part}`)
              })()}
              </h1>
            </div>
            <Link to="/partners" className="inline-flex h-12 items-center gap-2 px-6 text-[15px] font-semibold transition-transform hover:-translate-y-0.5" style={{ background: '#0b1a2c', color: '#fff', borderRadius: 'var(--radius-pill)' }}>
              <Users size={17} /> {t('dashboard.quickActions.findPartner')}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <CourseProgress lessons={myLessons} language={profile?.learning_language} level={profile?.language_levels?.[profile?.learning_language]} />

        {/* Available now */}
        <div className="lp-animate-in lp-delay-3">
          <SectionHeader title={t('dashboard.availableNow')} to="/partners" />
          {availableNow.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {availableNow.map((p, i) => (
                <div key={p.user_id} className="flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-card)' }}>
                  <div className="relative h-16" style={{ background: ['#f4d9cf', '#d6def5', '#c9ece2'][i % 3] }}>
                    <span className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgb(255 255 255 / 0.85)', color: '#0f6b55' }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 0 3px rgb(34 197 94 / 0.25)' }} />
                      {t('partners.visibilityNow')}
                    </span>
                  </div>
                  <div className="relative -mt-9 flex flex-1 flex-col items-center px-4 pb-5 text-center">
                    <Link to={`/partners/${p.user_id}`} className="flex w-full flex-col items-center">
                      <img src={resolveAvatarUrl(p.avatar, p.user_id, 128)} alt="" className="lp-avatar h-[72px] w-[72px] object-cover" style={{ border: '4px solid var(--surface)' }} />
                      <p className="lp-serif mt-2.5 w-full truncate text-lg" style={{ color: 'var(--ink)' }}>{p.full_name}</p>
                      <div className="mt-3 w-full space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{t('partners.teaches', 'Can teach')}</span>
                          <span className="lp-tag">{p.native_language}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{t('partners.learning', 'Learning')}</span>
                          <span className="lp-tag lp-tag--accent">{p.learning_language}</span>
                        </div>
                      </div>
                      {p.next_session_in_minutes != null && (
                        <p className="mt-2 text-[11px] font-semibold" style={{ color: '#8a5a12' }}>
                          {t('partners.sessionSoon', { count: p.next_session_in_minutes, defaultValue: 'Has a session in {{count}} min' })}
                        </p>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCall(p)}
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold transition-colors hover:brightness-110"
                      style={{ background: '#0b1a2c', color: '#fff', borderRadius: 'var(--radius-pill)' }}
                    >
                      <Phone size={15} /> {t('partners.callNow')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="lp-card text-sm" style={{ color: 'var(--ink-soft)' }}>{t('dashboard.availableNowEmpty')}</p>
          )}
        </div>

        {/* Quick actions */}
        <div className="my-8 grid gap-4 sm:grid-cols-3">
          <QuickAction to="/partners" icon={Users} title={t('dashboard.quickActions.findPartner')} subtitle={t('dashboard.quickActions.findPartnerSub')} bg="#f4d9cf" delay={1} />
          <QuickAction to="/schedule" icon={CalendarClock} title={t('dashboard.quickActions.schedule')} subtitle={t('dashboard.quickActions.scheduleSub')} bg="#d6def5" delay={2} />
          <QuickAction to="/materials" icon={BookOpenCheck} title={t('dashboard.quickActions.courses')} subtitle={t('dashboard.quickActions.coursesSub')} bg="#c9ece2" delay={3} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* Upcoming sessions */}
          <div className="lp-animate-in lp-delay-4">
            <SectionHeader title={t('dashboard.upcomingSessions')} to="/schedule" />
            {upcomingSessions.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingSessions.map((s) => {
                  const other = otherParty(s)
                  return (
                    <Link key={s.id} to="/schedule" className="lp-card lp-card--hover flex items-center gap-3 py-3" style={{ padding: '0.9rem 1.1rem' }}>
                      <img src={resolveAvatarUrl(null, other.id, 80)} alt="" className="lp-avatar h-11 w-11 shrink-0 object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold" style={{ color: 'var(--ink)' }}>{other.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                          {new Date(s.scheduled_time).toLocaleString(i18n.resolvedLanguage, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      <CalendarClock size={18} className="shrink-0" style={{ color: 'var(--accent-2)' }} />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="lp-card text-center">
                <span className="lp-icon-badge mx-auto mb-3 h-11 w-11"><Sparkles size={18} /></span>
                <p className="mx-auto max-w-xs text-sm" style={{ color: 'var(--ink-soft)' }}>
                  <Trans
                    i18nKey="dashboard.emptyStateBody"
                    components={{ link: <Link to="/partners" className="font-semibold underline underline-offset-2" style={{ color: 'var(--accent)' }} /> }}
                  />
                </p>
              </div>
            )}
          </div>

          {/* Tip of the day */}
          {tipOfDay && (
            <div className="lp-animate-in lp-delay-5">
              <h2 className="lp-serif mb-4 text-2xl" style={{ color: 'var(--ink)' }}>{t('dashboard.tipOfDay')}</h2>
              <div className="h-[calc(100%-3.25rem)] p-6" style={{ background: '#f4d9cf', color: '#17191d', borderRadius: 'var(--radius-card)' }}>
                <Lightbulb size={30} strokeWidth={1.5} className="mb-3" style={{ opacity: 0.7 }} />
                <p className="lp-serif text-lg leading-relaxed" style={{ fontWeight: 500 }}>{tipOfDay}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
