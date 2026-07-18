import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import AuthImagePanel from '../components/AuthImagePanel'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError(t('auth.login.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'

  return (
    <div className="grid lg:grid-cols-2 min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <AuthImagePanel quote={t('auth.login.quote')} />

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl mb-5"
            style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
          >
            <LogIn size={20} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--ink)' }}>{t('auth.login.title')}</h1>
          <p className="text-sm mb-7" style={{ color: 'var(--ink-soft)' }}>{t('auth.login.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('auth.login.email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('auth.login.password')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
              />
            </div>
            {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
            <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50">
              {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
            </button>
          </form>
          <p className="mt-6 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>
              {t('auth.login.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
