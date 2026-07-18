import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

const levelTag = {
  beginner: 'lp-tag lp-tag--accent2',
  elementary: 'lp-tag lp-tag--accent2',
  intermediate: 'lp-tag',
  advanced: 'lp-tag lp-tag--accent',
  fluent: 'lp-tag lp-tag--accent',
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [partners, setPartners] = useState([])
  const [sessions, setSessions] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  const quickActions = [
    { to: '/partners', label: t('dashboard.quickActions.findPartner'), sub: t('dashboard.quickActions.findPartnerSub'), icon: Users },
    { to: '/schedule', label: t('dashboard.quickActions.schedule'), sub: t('dashboard.quickActions.scheduleSub'), icon: CalendarClock },
    { to: '/courses', label: t('dashboard.quickActions.courses'), sub: t('dashboard.quickActions.coursesSub'), icon: BookOpenCheck },
  ]

  useEffect(() => {
    Promise.all([
      client.get('/matching/partners/'),
      client.get('/sessions/'),
      client.get('/courses/', { params: { language: user?.profile?.learning_language || undefined } }),
    ])
      .then(([p, s, c]) => {
        setPartners(p.data.slice(0, 3))
        setSessions(s.data.slice(0, 3))
        setCourses(c.data.slice(0, 3))
      })
      .finally(() => setLoading(false))
  }, [user])

  const profile = user?.profile

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      {/* Welcome banner */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-5">
            <img
              src={avatarUrl(user?.id, 128)}
              alt=""
              className="lp-avatar hidden sm:block h-16 w-16 shrink-0"
              style={{ border: '1px solid var(--line)' }}
            />
            <div>
              <p className="lp-eyebrow mb-1.5">{t('dashboard.eyebrow')}</p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
                {user?.first_name ? t('dashboard.welcomeWithName', { name: user.first_name }) : t('dashboard.welcome')}
              </h1>
              {profile?.native_language && profile?.learning_language ? (
                <div className="mt-2.5 flex items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
                  <span>{t('dashboard.speaking')} <span className="font-semibold" style={{ color: 'var(--ink)' }}>{profile.native_language}</span></span>
                  <span aria-hidden style={{ color: 'var(--line)' }}>／</span>
                  <span>{t('dashboard.learning')} <span className="font-semibold" style={{ color: 'var(--ink)' }}>{profile.learning_language}</span></span>
                </div>
              ) : (
                <p className="mt-2.5 text-sm" style={{ color: 'var(--ink-soft)' }}>
                  <Link to="/profile" className="underline underline-offset-2" style={{ color: 'var(--accent)' }}>
                    {t('dashboard.finishProfile')}
                  </Link>
                </p>
              )}
            </div>
          </div>
          <Link to="/partners" className="lp-btn-primary sm:ms-auto shrink-0">
            {t('dashboard.findAPartner')}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Quick actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to} className="lp-card flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center"
                style={{ borderRadius: 'var(--radius-tag)', background: 'var(--surface-2)', color: 'var(--accent)' }}
              >
                <action.icon size={18} strokeWidth={2} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{action.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{action.sub}</p>
              </div>
              <ArrowRight size={15} className="ms-auto shrink-0 rtl:rotate-180" style={{ color: 'var(--ink-soft)' }} />
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="lp-card animate-pulse">
                <div className="h-4 w-28 rounded mb-5" style={{ background: 'var(--surface-2)' }} />
                <div className="space-y-3">
                  <div className="h-3 rounded" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-3 rounded w-4/5" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-3 rounded w-3/5" style={{ background: 'var(--surface-2)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-5">
            <DashboardCard
              title={t('dashboard.suggestedPartners')}
              to="/partners"
              empty={partners.length === 0}
              emptyText={t('dashboard.suggestedPartnersEmpty')}
            >
              {partners.map((p) => (
                <li key={p.user_id}>
                  <Link to={`/partners/${p.user_id}`} className="flex items-center gap-3 py-2.5 text-sm hover:opacity-70" style={{ color: 'var(--ink)' }}>
                    <img src={avatarUrl(p.user_id, 64)} alt="" className="lp-avatar h-8 w-8 shrink-0" style={{ border: '1px solid var(--line)' }} />
                    <span className="font-medium truncate">{p.full_name}</span>
                    <span className={`ms-auto shrink-0 ${p.match_type === 'exchange' ? 'lp-tag lp-tag--accent2' : 'lp-tag'}`}>
                      {p.match_type === 'exchange' ? t('dashboard.exchange') : t('dashboard.peer')}
                    </span>
                  </Link>
                </li>
              ))}
            </DashboardCard>

            <DashboardCard
              title={t('dashboard.upcomingSessions')}
              to="/schedule"
              empty={sessions.length === 0}
              emptyText={t('dashboard.upcomingSessionsEmpty')}
            >
              {sessions.map((s) => {
                const date = new Date(s.scheduled_time)
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm" style={{ color: 'var(--ink)' }}>
                    <div
                      className="flex h-9 w-9 shrink-0 flex-col items-center justify-center leading-none font-mono"
                      style={{ borderRadius: 'var(--radius-tag)', background: 'var(--surface-2)' }}
                    >
                      <span className="text-[9px] font-semibold uppercase" style={{ color: 'var(--ink-soft)' }}>
                        {date.toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                      <span className="text-xs font-bold">{date.getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {s.host.id === user.id ? s.partner.full_name : s.host.full_name}
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--ink-soft)' }}>
                        {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </DashboardCard>

            <DashboardCard
              title={t('dashboard.keepLearning')}
              to="/courses"
              empty={courses.length === 0}
              emptyText={t('dashboard.keepLearningEmpty')}
            >
              {courses.map((c) => (
                <li key={c.id}>
                  <Link to={`/courses/${c.id}`} className="flex items-center justify-between gap-2 py-2.5 text-sm hover:opacity-70" style={{ color: 'var(--ink)' }}>
                    <span className="font-medium truncate">{c.title}</span>
                    <span className={`shrink-0 capitalize ${levelTag[c.level] || 'lp-tag'}`}>{t(`levels.${c.level}`, c.level)}</span>
                  </Link>
                </li>
              ))}
            </DashboardCard>
          </div>
        )}

        {!loading && partners.length === 0 && sessions.length === 0 && courses.length === 0 && (
          <div className="lp-card mt-8 flex items-start gap-3">
            <Sparkles size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
              <Trans
                i18nKey="dashboard.emptyStateBody"
                components={{ link: <Link to="/partners" className="font-semibold underline" style={{ color: 'var(--ink)' }} /> }}
              />
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardCard({ title, to, empty, emptyText, children }) {
  const { t } = useTranslation()
  return (
    <section className="lp-card">
      <div className="flex items-center justify-between mb-2">
        <h2 className="lp-eyebrow">{title}</h2>
        <Link to={to} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
          {t('common.seeAll')}
        </Link>
      </div>
      {empty ? (
        <p className="text-sm py-3" style={{ color: 'var(--ink-soft)' }}>{emptyText}</p>
      ) : (
        <ul style={{ borderTop: '1px solid var(--line)' }} className="[&>li]:border-b [&>li]:border-[var(--line)]">{children}</ul>
      )}
    </section>
  )
}
