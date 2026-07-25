import { CheckCircle2, Lock, LogIn, Mail, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import AuthHeroBackground from '../components/AuthHeroBackground'
import EmailVerifyForm from '../components/EmailVerifyForm'
import { useAuth } from '../context/AuthContext'

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

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [justVerified, setJustVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setJustVerified(false)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/home')
    } catch (err) {
      if (err.response?.data?.code === 'email_not_verified') {
        setStep('verifyEmail')
      } else {
        setError(t('auth.login.error'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative overflow-hidden lp-hero-bg bg-dots min-h-[calc(100vh-4rem)] flex flex-col items-center px-6 py-14">
      <AuthHeroBackground />

      <div className="relative w-full max-w-sm m-auto">
        <div key={step} className="lp-animate-in-scale">
          {step === 'password' && (
            <>
              <StepHeader icon={LogIn} title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />

              {justVerified && (
                <p className="flex items-center justify-center gap-1.5 text-sm mb-4" style={{ color: 'var(--accent-2)' }}>
                  <CheckCircle2 size={15} /> {t('auth.verifyEmail.success')}
                </p>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.login.email')}</label>
                  <IconInput icon={Mail} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.login.password')}</label>
                  <IconInput icon={Lock} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Link to="/forgot-password" className="mt-1.5 block text-end text-xs font-semibold hover:opacity-80" style={{ color: 'var(--accent)' }}>
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>
                {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
                <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50">
                  {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
                </button>
              </form>
              <p className="mt-5 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
                {t('auth.login.noAccount')}{' '}
                <Link to="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>
                  {t('auth.login.signUp')}
                </Link>
              </p>
            </>
          )}

          {step === 'verifyEmail' && (
            <>
              <StepHeader icon={MailCheck} title={t('auth.login.emailNotVerified')} subtitle={t('auth.register.checkEmailBody', { email })} />

              <EmailVerifyForm
                email={email}
                onVerified={() => {
                  setStep('password')
                  setJustVerified(true)
                }}
              />
              <button
                type="button"
                onClick={() => setStep('password')}
                className="mt-5 text-sm w-full text-center"
                style={{ color: 'var(--ink-soft)' }}
              >
                {t('auth.login.back')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
