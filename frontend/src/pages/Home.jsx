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
import { useAuth } from '../context/AuthContext'
import { downloadText } from '../utils/downloadFile'
import { downloadSummaryPdf } from '../utils/summaryPdf'
import { resolveAvatarUrl } from '../utils/images'

const dayOfYear = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now - start) / 86400000)
}

function QuickAction({ to, icon: Icon, title, subtitle, tint, delay }) {
  return (
    <Link to={to} className={`group lp-card lp-card--hover flex items-center gap-3.5 lp-animate-in lp-delay-${delay}`} style={{ padding: '1.1rem 1.25rem' }}>
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: `color-mix(in srgb, ${tint} 18%, transparent)`, color: tint }}
      >
        <Icon size={20} strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{title}</h3>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" style={{ color: 'var(--ink-soft)' }} />
    </Link>
  )
}

function SectionHeader({ title, to }) {
  const { t } = useTranslation()
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{title}</h2>
      <Link to={to} className="text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>{t('common.seeAll')}</Link>
    </div>
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

  const handleCall = async (p) => {
    try {
      const { data } = await client.post('/calls/ring/', { partner_id: p.user_id, notify: false })
      navigate(`/call/${data.room_id}?from=${user.id}&name=${encodeURIComponent(user.full_name)}`)
    } catch {
      window.alert(t('call.ringError'))
    }
  }

  const availableNow = partners.filter((p) => p.is_available_now).slice(0, 4)
  const upcomingSessions = upcoming.slice(0, 3)

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
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
      <div className="lp-hero-bg">
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-8">
          {/* Greeting */}
          <div className="lp-animate-in flex items-center gap-4">
            <img
              src={resolveAvatarUrl(profile?.avatar, user?.id, 128)}
              alt=""
              className="lp-avatar lp-gradient-ring h-16 w-16 shrink-0 object-cover"
            />
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: 'var(--ink)' }}>
              {user?.first_name ? t('dashboard.welcomeWithName', { name: user.first_name }) : t('dashboard.welcome')}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        {/* Available now */}
        <div className="lp-animate-in lp-delay-3">
          <SectionHeader title={t('dashboard.availableNow')} to="/partners" />
          {availableNow.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {availableNow.map((p) => (
                <div key={p.user_id} className="lp-card lp-card--hover flex flex-col items-center text-center" style={{ padding: '1.25rem 1rem' }}>
                  <Link to={`/partners/${p.user_id}`} className="flex w-full flex-col items-center">
                    <div className="relative">
                      <img src={resolveAvatarUrl(p.avatar, p.user_id, 128)} alt="" className="lp-avatar lp-gradient-ring h-16 w-16 object-cover" />
                      <span className="absolute bottom-0 end-0 h-4 w-4 rounded-full border-2" style={{ background: '#34d399', borderColor: 'var(--surface)' }} />
                    </div>
                    <p className="mt-3 w-full truncate text-sm font-bold" style={{ color: 'var(--ink)' }}>{p.full_name}</p>
                    <p className="mt-0.5 w-full truncate text-xs" style={{ color: 'var(--ink-soft)' }}>{p.native_language} → {p.learning_language}</p>
                  </Link>
                  <button type="button" onClick={() => handleCall(p)} className="lp-btn-primary mt-3 w-full">
                    <Phone size={15} /> {t('partners.callNow')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="lp-card text-sm" style={{ color: 'var(--ink-soft)' }}>{t('dashboard.availableNowEmpty')}</p>
          )}
        </div>

        {/* Quick actions */}
        <div className="my-8 grid gap-4 sm:grid-cols-3">
          <QuickAction to="/partners" icon={Users} title={t('dashboard.quickActions.findPartner')} subtitle={t('dashboard.quickActions.findPartnerSub')} tint="var(--accent)" delay={1} />
          <QuickAction to="/schedule" icon={CalendarClock} title={t('dashboard.quickActions.schedule')} subtitle={t('dashboard.quickActions.scheduleSub')} tint="var(--accent-2)" delay={2} />
          <QuickAction to="/materials" icon={BookOpenCheck} title={t('dashboard.quickActions.courses')} subtitle={t('dashboard.quickActions.coursesSub')} tint="var(--gold)" delay={3} />
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
              <h2 className="mb-4 font-display text-lg font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{t('dashboard.tipOfDay')}</h2>
              <div className="lp-card h-[calc(100%-2.75rem)]" style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent) 9%, var(--surface)), var(--surface))' }}>
                <span className="lp-icon-badge mb-3 h-10 w-10"><Lightbulb size={18} /></span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>{tipOfDay}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
