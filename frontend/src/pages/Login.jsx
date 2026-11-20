import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, MailCheck } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import AuthImagePanel from '../components/AuthImagePanel'
import EmailVerifyForm from '../components/EmailVerifyForm'
import GoogleButton from '../components/GoogleButton'
import LoginSplash from '../components/LoginSplash'
import { useAuth } from '../context/AuthContext'

const inputClass = 'w-full ps-10! pe-10! text-sm'
const inputStyle = { borderRadius: 'var(--radius-control)', height: '2.75rem' }

function IconInput({ icon: Icon, type, ...props }) {
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5" style={{ color: 'var(--ink-faint)' }} />
      <input {...props} type={isPassword && shown ? 'text' : type} className={inputClass} style={inputStyle} />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          tabIndex={-1}
          className="absolute top-1/2 -translate-y-1/2 end-3.5 hover:opacity-70"
          style={{ color: 'var(--ink-faint)' }}
        >
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  )
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-7 pb-5 lp-animate-in-scale" style={{ borderBottom: '1px solid var(--line)' }}>
      {Icon && (
        <span className="lp-icon-badge mb-4 h-9 w-9">
          <Icon size={18} />
        </span>
      )}
      <h1 className="lp-serif text-[2rem]">{title}</h1>
      <p className="lp-lede mt-2 text-[15px]">{subtitle}</p>
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
  const [splashName, setSplashName] = useState(null)
  const finishSplash = useCallback(() => navigate('/home'), [navigate])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setJustVerified(false)
    setSubmitting(true)
    try {
      const data = await login(email, password)
      setSplashName(data?.user?.first_name || data?.user?.profile?.display_name || '')
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
      {splashName !== null && <LoginSplash name={splashName} onDone={finishSplash} />}
      <AuthImagePanel quote={t('auth.login.quote')} />

      <div className="relative flex items-center justify-center px-6 py-12" style={{ background: '#F8FAFC' }}>
        <div className="relative w-full max-w-md">
          <div key={step} className="lp-animate-in-scale">
            {step === 'password' && (
              <>
                <StepHeader title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />

                {justVerified && (
                  <p
                    className="mb-5 flex items-center gap-2 px-3.5 py-2.5 text-sm"
                    style={{ borderRadius: 'var(--radius-control)', color: 'var(--ok)', background: 'var(--ok-soft)', border: '1px solid color-mix(in srgb, var(--ok) 30%, var(--line))' }}
                  >
                    <CheckCircle2 size={15} /> {t('auth.verifyEmail.success')}
                  </p>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium" style={{ color: 'var(--ink-soft)' }}>{t('auth.login.email')}</label>
                    <IconInput icon={Mail} type="email" required autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[13px] font-medium" style={{ color: 'var(--ink-soft)' }}>{t('auth.login.password')}</label>
                      <Link to="/forgot-password" className="text-[13px] font-medium hover:opacity-80" style={{ color: 'var(--accent)' }}>
                        {t('auth.login.forgotPassword')}
                      </Link>
                    </div>
                    <IconInput icon={Lock} type="password" required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  {error && (
                    <p
                      className="px-3.5 py-2.5 text-sm"
                      style={{ borderRadius: 'var(--radius-control)', color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger) 30%, var(--line))' }}
                    >
                      {error}
                    </p>
                  )}
                  <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50" style={{ height: '2.75rem', fontSize: '0.9rem' }}>
                    {submitting ? t('auth.login.submitting') : <>{t('auth.login.submit')} <ArrowRight size={18} className="rtl:rotate-180" /></>}
                  </button>
                </form>

                <GoogleButton onError={setError} />

                <p className="mt-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
                  {t('auth.login.noAccount')}{' '}
                  <Link to="/register" className="font-medium" style={{ color: 'var(--accent)' }}>
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
