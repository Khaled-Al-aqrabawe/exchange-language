import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  MessageCircle,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const quickActions = [
  { to: '/partners', label: 'Find a partner', icon: Users },
  { to: '/schedule', label: 'Schedule a session', icon: CalendarClock },
  { to: '/courses', label: 'Browse courses', icon: BookOpenCheck },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [partners, setPartners] = useState([])
  const [sessions, setSessions] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

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
  const initial = (user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Welcome banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-6 py-10 flex items-center gap-5">
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold text-white backdrop-blur-sm">
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back{user?.first_name ? `, ${user.first_name}` : ''}
            </h1>
            <p className="mt-1 text-slate-300 text-sm">
              {profile?.native_language && profile?.learning_language ? (
                <>Speaking <span className="text-white font-medium">{profile.native_language}</span> · Learning <span className="text-white font-medium">{profile.learning_language}</span></>
              ) : (
                <Link to="/profile" className="underline decoration-slate-500 hover:text-white">
                  Finish setting up your profile to get matched with partners
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-6 pb-14">
        {/* Quick actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <action.icon size={18} strokeWidth={2} />
              </div>
              <span className="font-semibold text-slate-800 text-sm">{action.label}</span>
              <ArrowRight size={15} className="ml-auto text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </Link>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading your dashboard...</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-5">
            <DashboardCard
              icon={Users}
              title="Suggested partners"
              to="/partners"
              empty={partners.length === 0}
              emptyText="No matches yet — try widening your profile languages."
            >
              {partners.map((p) => (
                <li key={p.user_id}>
                  <Link
                    to={`/partners/${p.user_id}`}
                    className="flex items-center justify-between py-2 text-sm text-slate-700 hover:text-indigo-600"
                  >
                    <span className="font-medium">{p.full_name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.match_type === 'exchange'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {p.match_type === 'exchange' ? 'Exchange' : 'Peer'}
                    </span>
                  </Link>
                </li>
              ))}
            </DashboardCard>

            <DashboardCard
              icon={CalendarClock}
              title="Upcoming sessions"
              to="/schedule"
              empty={sessions.length === 0}
              emptyText="Nothing scheduled yet."
            >
              {sessions.map((s) => (
                <li key={s.id} className="py-2 text-sm text-slate-700">
                  <span className="font-medium">{new Date(s.scheduled_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>{' '}
                  <span className="text-slate-400">·</span>{' '}
                  {new Date(s.scheduled_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  {' with '}
                  {s.host.id === user.id ? s.partner.full_name : s.host.full_name}
                </li>
              ))}
            </DashboardCard>

            <DashboardCard
              icon={BookOpenCheck}
              title="Keep learning"
              to="/courses"
              empty={courses.length === 0}
              emptyText="No courses yet."
            >
              {courses.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/courses/${c.id}`}
                    className="flex items-center justify-between py-2 text-sm text-slate-700 hover:text-indigo-600"
                  >
                    <span className="font-medium">{c.title}</span>
                    <span className="text-xs text-slate-400 capitalize">{c.level}</span>
                  </Link>
                </li>
              ))}
            </DashboardCard>
          </div>
        )}

        {!loading && partners.length === 0 && sessions.length === 0 && courses.length === 0 && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <Sparkles size={18} className="text-indigo-600 mt-0.5 shrink-0" />
            <p className="text-sm text-indigo-900">
              Your dashboard will fill up as partners join and courses are added — head to{' '}
              <Link to="/partners" className="font-semibold underline">Find a partner</Link> to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardCard({ icon: Icon, title, to, empty, emptyText, children }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900 text-sm">{title}</h2>
        </div>
        <Link to={to} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          See all
        </Link>
      </div>
      {empty ? (
        <p className="text-sm text-slate-400 py-2">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-100">{children}</ul>
      )}
    </section>
  )
}
