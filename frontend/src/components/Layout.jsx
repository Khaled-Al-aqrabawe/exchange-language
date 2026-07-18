import {
  BookOpenCheck,
  CalendarClock,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'

function useAuthedLinks() {
  const { t } = useTranslation()
  return [
    ['/dashboard', t('nav.dashboard'), LayoutDashboard],
    ['/partners', t('nav.partners'), Users],
    ['/messages', t('nav.messages'), MessageCircle],
    ['/schedule', t('nav.schedule'), CalendarClock],
    ['/courses', t('nav.courses'), BookOpenCheck],
  ]
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0">
      <span
        className="flex h-8 w-8 items-center justify-center font-display font-bold text-sm"
        style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 'var(--radius-tag)' }}
      >
        LP
      </span>
      <span className="font-display text-[18px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
        Language Partner
      </span>
    </Link>
  )
}

function UserMenu({ user, onLogout }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const name = user.first_name || user.email

  return (
    <div className="relative ms-2" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 py-1 ps-1 pe-2 transition-colors"
        style={{ borderRadius: 'var(--radius-pill)' }}
      >
        <img src={avatarUrl(user.id, 64)} alt="" className="lp-avatar h-8 w-8" style={{ border: '1px solid var(--line)' }} />
        <ChevronDown size={14} style={{ color: 'var(--ink-soft)' }} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute end-0 top-full mt-2 w-56 py-1.5 lp-surface"
          style={{ boxShadow: '0 12px 30px -12px rgb(0 0 0 / 0.25)' }}
        >
          <div className="px-3.5 py-2" style={{ borderBottom: '1px solid var(--line)' }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>{user.email}</p>
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm hover:opacity-70"
            style={{ color: 'var(--ink-soft)' }}
          >
            <Settings size={15} />
            {t('nav.settings')}
          </Link>
          <button
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm hover:opacity-70"
            style={{ color: '#c1443d' }}
          >
            <LogOut size={15} />
            {t('nav.logOut')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const authedLinks = useAuthedLinks()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--surface) 88%, transparent)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-1 text-sm flex-wrap">
            {user ? (
              <>
                {authedLinks.map(([to, label, Icon]) => (
                  <NavLink
                    key={to}
                    to={to}
                    className="flex items-center gap-1.5 px-3.5 py-2 font-semibold transition-colors"
                    style={({ isActive }) => ({
                      borderRadius: 'var(--radius-tag)',
                      color: isActive ? 'var(--accent-ink)' : 'var(--ink-soft)',
                      background: isActive ? 'var(--accent)' : 'transparent',
                    })}
                  >
                    <Icon size={15} strokeWidth={2.25} />
                    <span className="hidden md:inline">{label}</span>
                  </NavLink>
                ))}
                <span className="mx-1 hidden sm:inline-block h-5 w-px" style={{ background: 'var(--line)' }} />
                <ThemeToggle />
                <LanguageSwitcher />
                <UserMenu
                  user={user}
                  onLogout={() => {
                    logout()
                    navigate('/')
                  }}
                />
              </>
            ) : (
              <>
                <Link
                  to="/about"
                  className="px-3 py-2 font-medium"
                  style={{ borderRadius: 'var(--radius-tag)', color: location.pathname === '/about' ? 'var(--ink)' : 'var(--ink-soft)' }}
                >
                  {t('nav.about')}
                </Link>
                <Link
                  to="/faq"
                  className="px-3 py-2 font-medium"
                  style={{ borderRadius: 'var(--radius-tag)', color: location.pathname === '/faq' ? 'var(--ink)' : 'var(--ink-soft)' }}
                >
                  {t('nav.faq')}
                </Link>
                <ThemeToggle />
                <LanguageSwitcher />
                <Link to="/login" className="px-3 py-2 font-medium" style={{ borderRadius: 'var(--radius-tag)', color: 'var(--ink-soft)' }}>
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="lp-btn-primary ms-1">
                  {t('nav.signUpFree')}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
            <span
              className="flex h-6 w-6 items-center justify-center font-display font-bold text-[11px]"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 'var(--radius-tag)' }}
            >
              LP
            </span>
            <span>{t('footer.tagline')}</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
            <Link to="/about" className="hover:opacity-70">{t('nav.about')}</Link>
            <Link to="/faq" className="hover:opacity-70">{t('nav.faq')}</Link>
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  )
}
