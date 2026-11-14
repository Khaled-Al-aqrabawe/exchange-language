import {
  CalendarClock,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  NotebookPen,
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BrandMark, BrandWordmark } from './BrandLogo'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'
import LanguageSwitcher from './LanguageSwitcher'
import PresenceToggle from './PresenceToggle'
import IncomingCallBox from './IncomingCallBox'
import OngoingSessionBanner from './OngoingSessionBanner'
import NotificationBell from './NotificationBell'

function useAuthedLinks() {
  const { t } = useTranslation()
  return [
    ['/home', t('nav.home'), Home],
    ['/partners', t('nav.partners'), Users],
    ['/messages', t('nav.messages'), MessageCircle],
    ['/schedule', t('nav.schedule'), CalendarClock],
    ['/materials', t('nav.materials'), FileText],
  ]
}

const SOCIAL_ICON_PATHS = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  x: (
    <>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </>
  ),
  facebook: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M13.5 21v-6.5H15.5l.3-2.5h-2.3V10.3c0-.7.2-1.2 1.2-1.2H16V6.9c-.2 0-.9-.1-1.7-.1-1.7 0-2.8 1-2.8 2.9V12H9.7v2.5h1.8V21" fill="currentColor" stroke="none" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <line x1="7.6" y1="10.5" x2="7.6" y2="16.8" />
      <circle cx="7.6" cy="7.4" r="0.7" fill="currentColor" stroke="none" />
      <path d="M11.4 16.8v-4c0-1.3.9-2.3 2.1-2.3s2.1 1 2.1 2.3v4" />
    </>
  ),
}

const SOCIAL_COLORS = {
  instagram: 'var(--ink-soft)',
  x: 'var(--ink-soft)',
  facebook: 'var(--ink-soft)',
  linkedin: 'var(--ink-soft)',
}

function SocialIcon({ name, href, label }) {
  return (
    <a
      href={href}
      onClick={(e) => { if (href === '#') e.preventDefault() }}
      target={href !== '#' ? '_blank' : undefined}
      rel={href !== '#' ? 'noopener noreferrer' : undefined}
      aria-label={label}
      title={label}
      className="lp-social-icon flex h-9 w-9 items-center justify-center"
      style={{ borderRadius: 'var(--radius-tag)', border: '1px solid var(--line)', color: SOCIAL_COLORS[name] }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {SOCIAL_ICON_PATHS[name]}
      </svg>
    </a>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0">
      <BrandMark className="h-8 w-8" />
      <BrandWordmark className="text-[19px]" />
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
        <img src={avatarUrl(user.id, 64)} alt="" className="lp-avatar h-8 w-8 lp-gradient-ring" style={{ border: '1px solid var(--line)' }} />
        <ChevronDown size={14} style={{ color: 'var(--ink-soft)' }} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-56 py-1 lp-pop lp-animate-in-scale">
          <div className="px-3.5 py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--ink-faint)' }}>{user.email}</p>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--ink-soft)' }}
          >
            <UserRound size={15} />
            {t('nav.profile')}
          </Link>
          <Link
            to="/notes"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--ink-soft)' }}
          >
            <NotebookPen size={15} />
            {t('nav.notes')}
          </Link>
          <button
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--danger)', borderTop: '1px solid var(--line)' }}
          >
            <LogOut size={15} />
            {t('nav.logOut')}
          </button>
        </div>
      )}
    </div>
  )
}

const NO_FOOTER_PATHS = ['/login', '/register', '/forgot-password']

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const authedLinks = useAuthedLinks()
  const darkNav = true
  const hideFooter = NO_FOOTER_PATHS.includes(location.pathname) || location.pathname.startsWith('/call/')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={darkNav
          ? { background: '#0b1a2c', borderBottom: '1px solid rgb(255 255 255 / 0.12)', '--ink': '#fff', '--ink-soft': 'rgb(255 255 255 / 0.78)', '--line': 'rgb(255 255 255 / 0.2)', '--surface-2': 'rgb(255 255 255 / 0.1)', '--surface': '#0b1a2c', '--accent': '#7fd8c3', '--accent-2': '#7fd8c3', '--accent-soft': 'rgb(255 255 255 / 0.14)', '--ink-faint': 'rgb(255 255 255 / 0.55)' }
          : { background: 'color-mix(in srgb, var(--surface) 92%, transparent)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-0.5 text-sm min-w-0">
            {user ? (
              <>
                <div className="flex items-center gap-0.5 flex-nowrap overflow-x-auto min-w-0">
                  {authedLinks.map(([to, label, Icon]) => (
                    <NavLink
                      key={to}
                      to={to}
                      className="relative flex items-center gap-1.5 px-3 h-9 text-[13.5px] font-medium transition-colors shrink-0 hover:bg-[var(--surface-2)]"
                      style={({ isActive }) => ({
                        borderRadius: 'var(--radius-tag)',
                        color: isActive ? 'var(--accent)' : 'var(--ink-soft)',
                        background: isActive ? 'var(--accent-soft)' : undefined,
                      })}
                    >
                      <Icon size={15} strokeWidth={1.9} />
                      <span className="hidden lg:inline">{label}</span>
                    </NavLink>
                  ))}
                </div>
                <span className="mx-1 hidden sm:inline-block h-5 w-px shrink-0" style={{ background: 'var(--line)' }} />
                <span className="shrink-0"><PresenceToggle /></span>
                <span className="shrink-0"><NotificationBell /></span>
                <span className="shrink-0"><LanguageSwitcher /></span>
                <span className="shrink-0">
                  <UserMenu
                    user={user}
                    onLogout={() => {
                      logout()
                      navigate('/')
                    }}
                  />
                </span>
              </>
            ) : (
              <>
                <Link
                  to="/about"
                  className="px-3 py-2 text-[13.5px] font-medium transition-colors"
                  style={{ borderRadius: 'var(--radius-tag)', color: location.pathname === '/about' ? 'var(--ink)' : 'var(--ink-soft)' }}
                >
                  {t('nav.about')}
                </Link>
                <Link
                  to="/faq"
                  className="px-3 py-2 text-[13.5px] font-medium transition-colors"
                  style={{ borderRadius: 'var(--radius-tag)', color: location.pathname === '/faq' ? 'var(--ink)' : 'var(--ink-soft)' }}
                >
                  {t('nav.faq')}
                </Link>
                <span className="mx-1.5 hidden sm:inline-block h-5 w-px shrink-0" style={{ background: 'var(--line)' }} />
                <LanguageSwitcher />
                <Link to="/login" target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-[13.5px] font-medium" style={{ borderRadius: 'var(--radius-tag)', color: 'var(--ink-soft)' }}>
                  {t('nav.login')}
                </Link>
                <Link to="/register" className={darkNav ? 'lp-cta-mint ms-1' : 'lp-btn-primary ms-1'} style={darkNav ? { height: '2.25rem', padding: '0 1rem', fontSize: '0.875rem' } : undefined}>
                  {t('nav.signUpFree')}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <OngoingSessionBanner />
      <IncomingCallBox />

      <main className="flex-1">
        <Outlet />
      </main>

      {!hideFooter && (
        <footer className="lp-footer relative">
          <div className="max-w-6xl mx-auto px-6 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <BrandMark className="h-8 w-8" />
                <BrandWordmark className="text-lg" />
              </div>
              <p className="text-sm max-w-xs leading-relaxed mb-6" style={{ color: 'var(--ink-soft)' }}>
                {t('landing.heroSubtitle')}
              </p>
              <div className="flex items-center gap-2">
                <SocialIcon name="instagram" href="#" label="Instagram" />
                <SocialIcon name="x" href="#" label="X (Twitter)" />
                <SocialIcon name="facebook" href="#" label="Facebook" />
                <SocialIcon name="linkedin" href="#" label="LinkedIn" />
              </div>
            </div>

            <div>
              <p className="lp-eyebrow mb-3">{t('footer.explore')}</p>
              <div className="flex flex-col gap-2.5 text-sm">
                {user ? (
                  <>
                    <Link to="/home" className="w-fit hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }}>{t('nav.home')}</Link>
                    <Link to="/partners" className="w-fit hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }}>{t('nav.partners')}</Link>
                    <Link to="/materials" className="w-fit hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }}>{t('nav.materials')}</Link>
                  </>
                ) : (
                  <>
                    <Link to="/about" className="w-fit hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }}>{t('nav.about')}</Link>
                    <Link to="/faq" className="w-fit hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }}>{t('nav.faq')}</Link>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="lp-eyebrow mb-3">{user ? t('footer.account') : t('footer.getStarted')}</p>
              <div className="flex flex-col gap-2.5 text-sm">
                {user ? (
                  <>
                    <Link to="/profile" className="w-fit hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }}>{t('nav.profile')}</Link>
                    <Link to="/schedule" className="w-fit hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }}>{t('nav.schedule')}</Link>
                  </>
                ) : (
                  <>
                    <Link to="/login" target="_blank" rel="noopener noreferrer" className="w-fit hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }}>{t('nav.login')}</Link>
                    <Link to="/register" className="w-fit hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }}>{t('nav.signUpFree')}</Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 py-5" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </footer>
      )}
    </div>
  )
}
