import { Check, LogOut, Mail, Moon, Sun, UserCog } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { LANGUAGE_OPTIONS } from '../i18n/config'
import { avatarUrl } from '../utils/images'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="relative h-6 w-11 rounded-full transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'var(--surface-2)' }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }}
      />
    </button>
  )
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [notifyMessages, setNotifyMessages] = useState(
    localStorage.getItem('notify_messages') !== 'false'
  )
  const [notifySessions, setNotifySessions] = useState(
    localStorage.getItem('notify_sessions') !== 'false'
  )

  const toggleMessages = () => {
    const next = !notifyMessages
    setNotifyMessages(next)
    localStorage.setItem('notify_messages', String(next))
  }

  const toggleSessions = () => {
    const next = !notifySessions
    setNotifySessions(next)
    localStorage.setItem('notify_sessions', String(next))
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight mb-6" style={{ color: 'var(--ink)' }}>{t('settings.title')}</h1>

        <section className="lp-card mb-6">
          <div className="flex items-center gap-4">
            <img src={avatarUrl(user?.id, 100)} alt="" className="h-14 w-14 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{user?.full_name}</p>
              <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--ink-soft)' }}>
                <Mail size={13} /> {user?.email}
              </p>
            </div>
            <Link
              to="/profile"
              className="ms-auto inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70 shrink-0"
              style={{ color: 'var(--accent)' }}
            >
              <UserCog size={15} /> {t('settings.editProfile')}
            </Link>
          </div>
        </section>

        <section className="lp-card mb-6">
          <h2 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.appearance')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>{t('settings.appearanceBody')}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium"
              style={{
                borderRadius: 'var(--radius-tag)',
                border: '1px solid var(--line)',
                background: theme === 'light' ? 'var(--surface-2)' : 'transparent',
                color: theme === 'light' ? 'var(--accent)' : 'var(--ink-soft)',
              }}
            >
              <Sun size={15} /> {t('theme.light')} {theme === 'light' && <Check size={13} />}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium"
              style={{
                borderRadius: 'var(--radius-tag)',
                border: '1px solid var(--line)',
                background: theme === 'dark' ? 'var(--surface-2)' : 'transparent',
                color: theme === 'dark' ? 'var(--accent)' : 'var(--ink-soft)',
              }}
            >
              <Moon size={15} /> {t('theme.dark')} {theme === 'dark' && <Check size={13} />}
            </button>
          </div>
        </section>

        <section className="lp-card mb-6">
          <h2 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('settings.language')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>{t('settings.languageBody')}</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium"
                style={{
                  borderRadius: 'var(--radius-tag)',
                  border: '1px solid var(--line)',
                  background: i18n.resolvedLanguage === lang.code ? 'var(--surface-2)' : 'transparent',
                  color: i18n.resolvedLanguage === lang.code ? 'var(--accent)' : 'var(--ink-soft)',
                }}
              >
                {lang.nativeLabel} {i18n.resolvedLanguage === lang.code && <Check size={13} />}
              </button>
            ))}
          </div>
        </section>

        <section className="lp-card mb-6">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--ink)' }}>{t('settings.notifications')}</h2>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm" style={{ color: 'var(--ink)' }}>{t('settings.newMessageAlerts')}</span>
            <Toggle checked={notifyMessages} onChange={toggleMessages} />
          </div>
          <div className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>{t('settings.sessionReminders')}</span>
            <Toggle checked={notifySessions} onChange={toggleSessions} />
          </div>
        </section>

        <button
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 font-medium transition-colors hover:opacity-70"
          style={{ borderRadius: 'var(--radius-tag)', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
        >
          <LogOut size={16} /> {t('settings.logOut')}
        </button>
      </div>
    </div>
  )
}
