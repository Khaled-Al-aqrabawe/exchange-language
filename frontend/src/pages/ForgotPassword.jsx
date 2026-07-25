import { CheckCircle2, KeyRound, Lock, Mail, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import AuthHeroBackground from '../components/AuthHeroBackground'

const inputClass = 'w-full rounded-xl ps-10 pe-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

function IconInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" style={{ color: 'var(--ink-soft)' }} />
      <input {...props} className={inputClass} style={inputStyle} />
    </div>
  )
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center text-center mb-7 lp-animate-in-scale">
      <span className="lp-icon-badge h-12 w-12 mb-4">
        <Icon size={20} />
      </span>
      <h1 className="font-display text-2xl font-bold tracking-tight lp-gradient-text">{title}</h1>
      <p className="text-sm mt-1.5 max-w-xs" style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>
    </div>
  )
}

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const requestCode = async () => {
    await client.post('/auth/password-reset/request/', { email })
  }

  const handleRequestSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await requestCode()
      setStep('reset')
    } catch {
      // Still advance - the request endpoint never reveals whether the email exists.
      setStep('reset')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError(t('auth.forgotPassword.passwordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      await client.post('/auth/password-reset/confirm/', { email, code, new_password: newPassword })
      setStep('done')
    } catch (err) {
      const data = err.response?.data
      setError(data?.detail || t('auth.forgotPassword.invalidCode'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setError('')
    try {
      await requestCode()
    } catch {
      // Same generic behavior as the initial request.
    }
  }

  return (
    <div className="relative overflow-hidden lp-hero-bg bg-dots min-h-[calc(100vh-4rem)] flex flex-col items-center px-6 py-14">
      <AuthHeroBackground />

      <div className="relative w-full max-w-sm m-auto">
        <div key={step} className="lp-animate-in-scale">
          {step === 'request' && (
            <>
              <StepHeader icon={Mail} title={t('auth.forgotPassword.requestTitle')} subtitle={t('auth.forgotPassword.requestSubtitle')} />

              <form onSubmit={handleRequestSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.forgotPassword.email')}</label>
                  <IconInput icon={Mail} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
                <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50">
                  {submitting ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendCode')}
                </button>
              </form>
              <p className="mt-5 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
                <Link to="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
              </p>
            </>
          )}

          {step === 'reset' && (
            <>
              <StepHeader icon={MailCheck} title={t('auth.forgotPassword.sentTitle')} subtitle={t('auth.forgotPassword.sentSubtitle', { email })} />

              <form onSubmit={handleResetSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.forgotPassword.code')}</label>
                  <IconInput
                    icon={KeyRound}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t('auth.forgotPassword.codePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.forgotPassword.newPassword')}</label>
                  <IconInput icon={Lock} type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.forgotPassword.confirmPassword')}</label>
                  <IconInput icon={Lock} type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
                <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50">
                  {submitting ? t('auth.forgotPassword.resetting') : t('auth.forgotPassword.resetSubmit')}
                </button>
              </form>
              <div className="mt-5 flex items-center justify-between text-sm">
                <Link to="/login" style={{ color: 'var(--ink-soft)' }}>
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
                <button type="button" onClick={handleResend} className="font-semibold" style={{ color: 'var(--accent)' }}>
                  {t('auth.forgotPassword.resendCode')}
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <StepHeader icon={CheckCircle2} title={t('auth.forgotPassword.successTitle')} subtitle={t('auth.forgotPassword.successBody')} />
              <Link to="/login" className="lp-btn-primary w-full justify-center">
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
