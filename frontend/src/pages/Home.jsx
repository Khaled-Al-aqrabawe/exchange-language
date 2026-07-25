import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import CourseCover from '../components/CourseCover'
import MessageMockup from '../components/MessageMockup'
import { useAuth } from '../context/AuthContext'
import { resolveAvatarUrl } from '../utils/images'

const dayOfYear = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now - start) / 86400000)
}

function StatTile({ icon: Icon, value, label, accent, delay }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 lp-animate-in-scale lp-delay-${delay}`}
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card-hover)', border: '1px solid var(--line)' }}
    >
      <span
        className="pointer-events-none absolute -top-6 -end-6 h-20 w-20 rounded-full blur-2xl"
        style={{ background: accent, opacity: 0.18 }}
      />
      <span
        className="relative flex h-10 w-10 items-center justify-center rounded-xl mb-3"
        style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
      >
        <Icon size={18} />
      </span>
      <p className="relative font-display text-3xl font-bold leading-none" style={{ color: 'var(--ink)' }}>{value}</p>
      <p className="relative text-xs mt-1.5" style={{ color: 'var(--ink-soft)' }}>{label}</p>
    </div>
  )
}

function QuickAction({ to, icon: Icon, title, subtitle, accent, delay }) {
  return (
    <Link
      to={to}
      className={`group lp-card lp-card--hover flex items-center gap-3.5 lp-animate-in lp-delay-${delay}`}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
        style={{ background: accent, color: '#fff' }}
      >
        <Icon size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{title}</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 rtl:rotate-180 transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" style={{ color: 'var(--ink-soft)' }} />
    </Link>
  )
}

function SectionHeader({ title, to }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{title}</h2>
      <Link to={to} className="text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>{t('common.seeAll')}</Link>
    </div>
  )
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const profile = user?.profile

  const [sessions, setSessions] = useState([])
  const [partners, setPartners] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      client.get('/sessions/').then(({ data }) => data).catch(() => []),
      client.get('/matching/partners/').then(({ data }) => data).catch(() => []),
      client.get('/courses/').then(({ data }) => data).catch(() => []),
    ]).then(([s, p, c]) => {
      setSessions(s)
      setPartners(p)
      setCourses(c)
    }).finally(() => setLoading(false))
  }, [])

  const tips = t('dashboard.tips', { returnObjects: true })
  const tipList = Array.isArray(tips) ? tips : []
  const tipOfDay = tipList.length ? tipList[dayOfYear() % tipList.length] : ''

  const otherParty = (session) => (session.host.id === user?.id ? session.partner : session.host)

  const completedCount = sessions.filter(
    (s) => s.status === 'completed' && (s.host.id === user?.id || s.partner.id === user?.id)
  ).length
  const upcoming = sessions
    .filter((s) => s.status === 'confirmed' && new Date(s.scheduled_time) > new Date())
    .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
  const connectedPartners = new Set(
    sessions
      .filter((s) => ['confirmed', 'completed'].includes(s.status))
      .map((s) => otherParty(s).id)
  )

  const suggestedPartners = partners.slice(0, 3)
  const upcomingSessions = upcoming.slice(0, 3)
  const keepLearningCourses = courses.slice(0, 3)

  const nothingYet = !loading && suggestedPartners.length === 0 && upcomingSessions.length === 0 && keepLearningCourses.length === 0

  const practiceList = [
    t('landing.practiceList.matched'),
    t('landing.practiceList.builtin'),
    t('landing.practiceList.free'),
  ]

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        {/* Hero banner */}
        <div
          className="relative overflow-hidden rounded-3xl bg-dots px-7 py-8 sm:px-9 sm:py-10 mb-6 lp-animate-in"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <span className="pointer-events-none absolute -top-20 -end-10 h-64 w-64 rounded-full blur-3xl lp-blob-drift" style={{ background: 'rgb(255 255 255 / 0.2)' }} />
          <span className="pointer-events-none absolute -bottom-24 -start-10 h-64 w-64 rounded-full blur-3xl lp-blob-drift" style={{ background: 'rgb(0 0 0 / 0.15)', animationDelay: '4s' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <img
                src={resolveAvatarUrl(profile?.avatar, user?.id, 128)}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                style={{ border: '2px solid rgb(255 255 255 / 0.7)' }}
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(255 255 255 / 0.75)' }}>{t('dashboard.eyebrow')}</p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1">
                  {user?.first_name ? t('dashboard.welcomeWithName', { name: user.first_name }) : t('dashboard.welcome')}
                </h1>
                {profile?.native_language && profile?.learning_language ? (
                  <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full" style={{ background: 'rgb(255 255 255 / 0.16)', color: '#fff' }}>
                      {t('dashboard.speaking')} {profile.native_language}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full" style={{ background: 'rgb(255 255 255 / 0.16)', color: '#fff' }}>
                      {t('dashboard.learning')} {profile.learning_language}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2.5 text-sm">
                    <Link to="/profile" className="underline underline-offset-2 text-white">
                      {t('dashboard.finishProfile')}
                    </Link>
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/partners"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white font-semibold text-sm hover:opacity-90 transition-opacity sm:ms-auto shrink-0 w-fit"
              style={{ color: 'var(--accent)' }}
            >
              {t('dashboard.findAPartner')}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Stats — overlapping the banner slightly for a layered feel */}
        <div className="grid grid-cols-3 gap-4 -mt-2 mb-8 relative">
          <StatTile icon={CalendarCheck} value={completedCount} label={t('dashboard.stats.completed')} accent="var(--accent)" delay={1} />
          <StatTile icon={CalendarClock} value={upcoming.length} label={t('dashboard.stats.upcoming')} accent="var(--accent-2)" delay={2} />
          <StatTile icon={Users} value={connectedPartners.size} label={t('dashboard.stats.partners')} accent="#c98a1c" delay={3} />
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <QuickAction to="/partners" icon={Users} title={t('dashboard.quickActions.findPartner')} subtitle={t('dashboard.quickActions.findPartnerSub')} accent="var(--accent)" delay={1} />
          <QuickAction to="/schedule" icon={CalendarClock} title={t('dashboard.quickActions.schedule')} subtitle={t('dashboard.quickActions.scheduleSub')} accent="var(--accent-2)" delay={2} />
          <QuickAction to="/courses" icon={BookOpenCheck} title={t('dashboard.quickActions.courses')} subtitle={t('dashboard.quickActions.coursesSub')} accent="#c98a1c" delay={3} />
        </div>

        {/* About / product showcase — the story behind the platform, paired with a live animated preview */}
        <div className="relative overflow-hidden rounded-3xl mb-8 lp-animate-in lp-delay-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="grid lg:grid-cols-2 gap-10 items-center px-7 py-9 sm:px-9">
            <div>
              <p className="lp-eyebrow mb-2" style={{ color: 'var(--accent-2)' }}>{t('landing.realConversations')}</p>
              <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: 'var(--ink)' }}>{t('landing.practiceHeadline')}</p>
              <p className="leading-relaxed mb-5 text-sm" style={{ color: 'var(--ink-soft)' }}>{t('landing.practiceBody')}</p>
              <ul className="space-y-2.5">
                {practiceList.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--ink)' }}>
                    <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-2)' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center lp-animate-in-scale lp-delay-2">
              <MessageMockup />
            </div>
          </div>
        </div>

        {/* Tip of the day */}
        {tipOfDay && (
          <div className="flex items-start gap-3 mb-8 lp-card lp-animate-in lp-delay-4" style={{ background: 'color-mix(in srgb, var(--accent) 6%, var(--surface))' }}>
            <span className="lp-icon-badge h-10 w-10 shrink-0">
              <Lightbulb size={18} />
            </span>
            <div>
              <p className="lp-eyebrow mb-1">{t('dashboard.tipOfDay')}</p>
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{tipOfDay}</p>
            </div>
          </div>
        )}

        {nothingYet ? (
          <div className="lp-card text-center py-14 lp-animate-in lp-delay-5">
            <span className="lp-icon-badge h-12 w-12 mb-4 mx-auto">
              <Sparkles size={20} />
            </span>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--ink-soft)' }}>
              <Trans
                i18nKey="dashboard.emptyStateBody"
                components={{ link: <Link to="/partners" className="font-semibold underline underline-offset-2" style={{ color: 'var(--accent)' }} /> }}
              />
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8 mb-10">
            {/* Upcoming sessions */}
            <div className="lp-animate-in lp-delay-4">
              <SectionHeader title={t('dashboard.upcomingSessions')} to="/schedule" />
              {upcomingSessions.length > 0 ? (
                <div className="space-y-2.5">
                  {upcomingSessions.map((s) => {
                    const other = otherParty(s)
                    return (
                      <Link
                        key={s.id}
                        to="/schedule"
                        className="lp-card lp-card--hover flex items-center gap-3 py-3"
                      >
                        <img src={resolveAvatarUrl(null, other.id, 80)} alt="" className="lp-avatar h-10 w-10 shrink-0 object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{other.full_name}</p>
                          <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                            {new Date(s.scheduled_time).toLocaleString(i18n.resolvedLanguage, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                        <CalendarClock size={16} className="shrink-0" style={{ color: 'var(--accent-2)' }} />
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm lp-card" style={{ color: 'var(--ink-soft)' }}>{t('dashboard.upcomingSessionsEmpty')}</p>
              )}
            </div>

            {/* Suggested partners */}
            <div className="lp-animate-in lp-delay-5">
              <SectionHeader title={t('dashboard.suggestedPartners')} to="/partners" />
              {suggestedPartners.length > 0 ? (
                <div className="space-y-2.5">
                  {suggestedPartners.map((p) => (
                    <Link
                      key={p.user_id}
                      to={`/partners/${p.user_id}`}
                      className="lp-card lp-card--hover flex items-center gap-3 py-3"
                    >
                      <img src={resolveAvatarUrl(p.avatar, p.user_id, 80)} alt="" className="lp-avatar h-10 w-10 shrink-0 object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{p.full_name}</p>
                        <p className="text-xs" style={{ color: p.match_type === 'exchange' ? 'var(--accent)' : 'var(--accent-2)' }}>
                          {p.match_type === 'exchange' ? t('dashboard.exchange') : t('dashboard.peer')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm lp-card" style={{ color: 'var(--ink-soft)' }}>{t('dashboard.suggestedPartnersEmpty')}</p>
              )}
            </div>
          </div>
        )}

        {/* Keep learning */}
        {keepLearningCourses.length > 0 && (
          <div className="lp-animate-in lp-delay-6">
            <SectionHeader title={t('dashboard.keepLearning')} to="/courses" />
            <div className="grid sm:grid-cols-3 gap-4">
              {keepLearningCourses.map((c) => (
                <Link key={c.id} to={`/courses/${c.id}`} className="lp-surface lp-card--hover block overflow-hidden">
                  <CourseCover course={c} className="aspect-video" />
                  <div className="p-3.5">
                    <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>{c.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{c.language}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
