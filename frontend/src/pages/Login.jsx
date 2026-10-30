import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import AuthImagePanel from '../components/AuthImagePanel'
import EmailVerifyForm from '../components/EmailVerifyForm'
import { useAuth } from '../context/AuthContext'

const inputClass = 'h-13 w-full rounded-2xl ps-11 pe-11 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)', height: '2.75rem' }

function IconInput({ icon: Icon, type, ...props }) {
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="relative">
      <Icon size={17} className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-4" style={{ color: 'var(--ink-soft)' }} />
      <input {...props} type={isPassword && shown ? 'text' : type} className={inputClass} style={inputStyle} />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          tabIndex={-1}
          className="absolute top-1/2 -translate-y-1/2 end-4 hover:opacity-70"
          style={{ color: 'var(--ink-soft)' }}
        >
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  )
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6 lp-animate-in-scale">
      {Icon && (
        <span className="lp-icon-badge mb-4 h-10 w-10">
          <Icon size={19} />
        </span>
      )}
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>
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
    <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[1.05fr_1fr]">
      <AuthImagePanel quote={t('auth.login.quote')} />

      <div className="relative flex items-center justify-center px-6 py-8 lp-hero-bg">
        <div className="relative w-full max-w-md">
          <div key={step} className="lp-animate-in-scale">
            {step === 'password' && (
              <>
                <StepHeader title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />

                {justVerified && (
                  <p className="mb-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, var(--surface))' }}>
                    <CheckCircle2 size={16} /> {t('auth.verifyEmail.success')}
                  </p>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{t('auth.login.email')}</label>
                    <IconInput icon={Mail} type="email" required autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{t('auth.login.password')}</label>
                      <Link to="/forgot-password" className="text-sm font-semibold hover:opacity-80" style={{ color: 'var(--accent)' }}>
                        {t('auth.login.forgotPassword')}
                      </Link>
                    </div>
                    <IconInput icon={Lock} type="password" required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  {error && (
                    <p className="rounded-2xl px-4 py-3 text-sm font-medium" style={{ color: '#c1443d', background: 'color-mix(in srgb, #c1443d 10%, var(--surface))' }}>{error}</p>
                  )}
                  <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50" style={{ height: '2.75rem', fontSize: '0.9rem' }}>
                    {submitting ? t('auth.login.submitting') : <>{t('auth.login.submit')} <ArrowRight size={18} className="rtl:rotate-180" /></>}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
                  {t('auth.login.noAccount')}{' '}
                  <Link to="/register" className="font-bold" style={{ color: 'var(--accent)' }}>
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
                  className="mt-5 w-full text-center text-sm"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  {t('auth.login.back')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
