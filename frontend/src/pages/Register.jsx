import { CalendarDays, Globe2, Languages, Lock, Mail, MailCheck, Sparkles, UserPlus, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import AuthHeroBackground from '../components/AuthHeroBackground'
import EmailVerifyForm from '../components/EmailVerifyForm'
import { COUNTRIES, GENDERS, LANGUAGES, LEVELS } from '../constants'
import { useAuth } from '../context/AuthContext'
import { detectTimezone } from '../utils/timezone'

const inputClass = 'w-full rounded-xl ps-10 pe-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

const STEPS = ['account', 'about', 'languages']

function IconField({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none z-10" style={{ color: 'var(--ink-soft)' }} />
      {children}
    </div>
  )
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center text-center mb-6 lp-animate-in-scale">
      <span className="lp-icon-badge h-12 w-12 mb-4">
        <Icon size={20} />
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm mt-1.5 max-w-xs" style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>
    </div>
  )
}

function StepDots({ current }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-7">
      {STEPS.map((s, i) => (
        <span
          key={s}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: STEPS.indexOf(current) === i ? '20px' : '6px',
            background: STEPS.indexOf(current) >= i ? 'var(--accent)' : 'var(--line)',
          }}
        />
      ))}
    </div>
  )
}

// Latest date of birth that makes someone at least 16 years old today.
function maxDateOfBirth() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 16)
  return d.toISOString().slice(0, 10)
}

export default function Register() {
  const { t, i18n } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('account')
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', gender: '', country: '', date_of_birth: '',
    native_language: 'English', learning_language: 'Arabic', proficiency_level: 'beginner', speaking_level: 'fluent',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountError, setAccountError] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const goNext = (e, next) => {
    e.preventDefault()
    setStep(next)
  }

  const handleAccountSubmit = (e) => {
    e.preventDefault()
    if (form.password !== confirmPassword) {
      setAccountError(t('auth.register.passwordMismatch'))
      return
    }
    setAccountError('')
    setStep('about')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await register({ ...form, timezone: detectTimezone(), ui_language: i18n.resolvedLanguage })
      setRegisteredEmail(data.email)
    } catch (err) {
      const data = err.response?.data
      setError(data ? Object.values(data).flat().join(' ') : t('auth.register.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (registeredEmail) {
    return (
      <div className="relative overflow-hidden lp-hero-bg bg-dots min-h-[calc(100vh-4rem)] flex flex-col items-center px-6 py-14">
        <AuthHeroBackground />
        <div className="lp-auth-card relative w-full max-w-md m-auto lp-animate-in">
          <StepHeader icon={MailCheck} title={t('auth.register.checkEmailTitle')} subtitle={t('auth.register.checkEmailBody', { email: registeredEmail })} />
          <EmailVerifyForm email={registeredEmail} onVerified={() => navigate('/home')} />
          <p className="mt-6 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
            <Link to="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>{t('auth.register.logIn')}</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden lp-hero-bg bg-dots min-h-[calc(100vh-4rem)] flex flex-col items-center px-6 py-14">
      <AuthHeroBackground />

      <div className="lp-auth-card relative w-full max-w-md m-auto">
        <StepDots current={step} />

        <div key={step} className="lp-animate-in-scale">
          {step === 'account' && (
            <>
              <StepHeader icon={UserPlus} title={t('auth.register.title')} subtitle={t('auth.register.subtitle')} />
              <form onSubmit={handleAccountSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.firstName')}</label>
                    <IconField icon={UserRound}>
                      <input required value={form.first_name} onChange={update('first_name')} className={inputClass} style={inputStyle} />
                    </IconField>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.lastName')}</label>
                    <IconField icon={UserRound}>
                      <input required value={form.last_name} onChange={update('last_name')} className={inputClass} style={inputStyle} />
                    </IconField>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.email')}</label>
                  <IconField icon={Mail}>
                    <input type="email" required value={form.email} onChange={update('email')} className={inputClass} style={inputStyle} />
                  </IconField>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.password')}</label>
                  <IconField icon={Lock}>
                    <input type="password" required minLength={8} value={form.password} onChange={update('password')} className={inputClass} style={inputStyle} />
                  </IconField>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.confirmPassword')}</label>
                  <IconField icon={Lock}>
                    <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} style={inputStyle} />
                  </IconField>
                </div>
                {accountError && <p className="text-sm" style={{ color: '#c1443d' }}>{accountError}</p>}
                <button type="submit" className="lp-btn-primary w-full">{t('auth.register.continue')}</button>
              </form>
              <p className="mt-5 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
                {t('auth.register.haveAccount')}{' '}
                <Link to="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>{t('auth.register.logIn')}</Link>
              </p>
            </>
          )}

          {step === 'about' && (
            <>
              <StepHeader icon={Globe2} title={t('auth.register.step2Title')} subtitle={t('auth.register.step2Subtitle')} />
              <form onSubmit={(e) => goNext(e, 'languages')} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.gender')}</label>
                  <IconField icon={Users}>
                    <select required value={form.gender} onChange={update('gender')} className={inputClass} style={inputStyle}>
                      <option value="" disabled>{t('profile.select')}</option>
                      {GENDERS.map((g) => <option key={g} value={g}>{t(`genders.${g}`)}</option>)}
                    </select>
                  </IconField>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.dateOfBirth')}</label>
                  <IconField icon={CalendarDays}>
                    <input type="date" required max={maxDateOfBirth()} value={form.date_of_birth} onChange={update('date_of_birth')} className={inputClass} style={inputStyle} />
                  </IconField>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.country')}</label>
                  <IconField icon={Globe2}>
                    <select required value={form.country} onChange={update('country')} className={inputClass} style={inputStyle}>
                      <option value="" disabled>{t('profile.select')}</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </IconField>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('account')} className="lp-btn-secondary w-full">{t('auth.register.back')}</button>
                  <button type="submit" className="lp-btn-primary w-full">{t('auth.register.continue')}</button>
                </div>
              </form>
            </>
          )}

          {step === 'languages' && (
            <>
              <StepHeader icon={Languages} title={t('auth.register.step3Title')} subtitle={t('auth.register.step3Subtitle')} />
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.iSpeak')}</label>
                    <IconField icon={Languages}>
                      <select value={form.native_language} onChange={update('native_language')} className={inputClass} style={inputStyle}>
                        {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </IconField>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.iAmLearning')}</label>
                    <IconField icon={Languages}>
                      <select value={form.learning_language} onChange={update('learning_language')} className={inputClass} style={inputStyle}>
                        {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </IconField>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.myLevel')}</label>
                    <IconField icon={Sparkles}>
                      <select value={form.speaking_level} onChange={update('speaking_level')} className={inputClass} style={inputStyle}>
                        {LEVELS.map(([value]) => <option key={value} value={value}>{t(`levels.${value}`)}</option>)}
                      </select>
                    </IconField>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('auth.register.myLevel')}</label>
                    <IconField icon={Sparkles}>
                      <select value={form.proficiency_level} onChange={update('proficiency_level')} className={inputClass} style={inputStyle}>
                        {LEVELS.map(([value]) => <option key={value} value={value}>{t(`levels.${value}`)}</option>)}
                      </select>
                    </IconField>
                  </div>
                </div>
                {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('about')} className="lp-btn-secondary w-full">{t('auth.register.back')}</button>
                  <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50">
                    {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
