import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import AuthImagePanel from '../components/AuthImagePanel'
import { LANGUAGES } from '../constants'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

export default function Register() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '',
    native_language: 'English', learning_language: 'Arabic',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data
      setError(data ? Object.values(data).flat().join(' ') : t('auth.register.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-2 min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <AuthImagePanel quote={t('auth.register.quote')} />

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl mb-5"
            style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
          >
            <UserPlus size={20} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--ink)' }}>{t('auth.register.title')}</h1>
          <p className="text-sm mb-7" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('auth.register.firstName')}</label>
                <input value={form.first_name} onChange={update('first_name')} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('auth.register.lastName')}</label>
                <input value={form.last_name} onChange={update('last_name')} className={inputClass} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('auth.register.email')}</label>
              <input type="email" required value={form.email} onChange={update('email')} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('auth.register.password')}</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={update('password')}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('auth.register.iSpeak')}</label>
                <select value={form.native_language} onChange={update('native_language')} className={inputClass} style={inputStyle}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('auth.register.iAmLearning')}</label>
                <select value={form.learning_language} onChange={update('learning_language')} className={inputClass} style={inputStyle}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
            <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50">
              {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
            </button>
          </form>
          <p className="mt-6 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
            {t('auth.register.haveAccount')}{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>
              {t('auth.register.logIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
