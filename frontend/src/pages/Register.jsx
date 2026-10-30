import { CalendarDays, Globe2, Languages, Lock, Mail, MailCheck, Sparkles, UserPlus, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { AuthStepHeader as StepHeader, authInputClass as inputClass, authInputStyle as inputStyle, authLabelClass } from '../components/AuthShell'
import EmailVerifyForm from '../components/EmailVerifyForm'
import { COUNTRIES, GENDERS, LANGUAGES, MATERIAL_LEVELS } from '../constants'
import { useAuth } from '../context/AuthContext'
import { detectTimezone } from '../utils/timezone'

const STEPS = ['account', 'about', 'languages']

function IconField({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon size={18} className="absolute top-1/2 -translate-y-1/2 start-4 pointer-events-none z-10" style={{ color: 'var(--ink-soft)' }} />
      {children}
    </div>
  )
}

function StepDots({ current }) {
  const index = STEPS.indexOf(current)
  return (
    <div className="mb-6 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <span
          key={s}
          className="h-1.5 flex-1 rounded-full transition-all duration-300"
          style={{ background: index >= i ? 'var(--gradient-brand)' : 'var(--line)' }}
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
    native_language: 'Arabic', spoken_language: '', spoken_level: 'B1', learning_language: 'English', learning_level: 'A1',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountError, setAccountError] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const update = (field) => (e) => {
    const next = { ...form, [field]: e.target.value }
    // the three languages must differ: drop a clash with the native language, then re-pick what to learn
    if (next.spoken_language === next.native_language) next.spoken_language = ''
    if (next.learning_language === next.native_language || next.learning_language === next.spoken_language) {
      next.learning_language = LANGUAGES.find((l) => l !== next.native_language && l !== next.spoken_language)
    }
    setForm(next)
  }

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
      const { spoken_language, spoken_level, learning_level, ...rest } = form
      const data = await register({
        ...rest,
        spoken_languages: spoken_language ? [spoken_language] : [],
        learning_languages: [form.learning_language],
        language_levels: {
          [form.learning_language]: learning_level,
          ...(spoken_language ? { [spoken_language]: spoken_level } : {}),
        },
        timezone: detectTimezone(),
        ui_language: i18n.resolvedLanguage,
      })
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
      <AuthShell>
        <div className="lp-animate-in">
          <StepHeader icon={MailCheck} title={t('auth.register.checkEmailTitle')} subtitle={t('auth.register.checkEmailBody', { email: registeredEmail })} />
          <EmailVerifyForm email={registeredEmail} onVerified={() => navigate('/home')} />
          <p className="mt-6 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
            <Link to="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>{t('auth.register.logIn')}</Link>
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div>
        <StepDots current={step} />

        <div key={step} className="lp-animate-in-scale">
          {step === 'account' && (
            <>
              <StepHeader icon={UserPlus} title={t('auth.register.title')} subtitle={t('auth.register.subtitle')} />
              <form onSubmit={handleAccountSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={authLabelClass}>{t('auth.register.firstName')}</label>
                    <IconField icon={UserRound}>
                      <input required value={form.first_name} onChange={update('first_name')} className={inputClass} style={inputStyle} />
                    </IconField>
                  </div>
                  <div>
                    <label className={authLabelClass}>{t('auth.register.lastName')}</label>
                    <IconField icon={UserRound}>
                      <input required value={form.last_name} onChange={update('last_name')} className={inputClass} style={inputStyle} />
                    </IconField>
                  </div>
                </div>
                <div>
                  <label className={authLabelClass}>{t('auth.register.email')}</label>
                  <IconField icon={Mail}>
                    <input type="email" required value={form.email} onChange={update('email')} className={inputClass} style={inputStyle} />
                  </IconField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={authLabelClass}>{t('auth.register.password')}</label>
                    <IconField icon={Lock}>
                      <input type="password" required minLength={8} value={form.password} onChange={update('password')} className={inputClass} style={inputStyle} />
                    </IconField>
                  </div>
                  <div>
                    <label className={authLabelClass}>{t('auth.register.confirmPassword')}</label>
                    <IconField icon={Lock}>
                      <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} style={inputStyle} />
                    </IconField>
                  </div>
                </div>
                {accountError && <p className="text-sm" style={{ color: '#c1443d' }}>{accountError}</p>}
                <button type="submit" className="lp-btn-primary w-full" style={{ height: '2.75rem', fontSize: '0.9rem' }}>{t('auth.register.continue')}</button>
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
                  <label className={authLabelClass}>{t('auth.register.gender')}</label>
                  <IconField icon={Users}>
                    <select required value={form.gender} onChange={update('gender')} className={inputClass} style={inputStyle}>
                      <option value="" disabled>{t('profile.select')}</option>
                      {GENDERS.map((g) => <option key={g} value={g}>{t(`genders.${g}`)}</option>)}
                    </select>
                  </IconField>
                </div>
                <div>
                  <label className={authLabelClass}>{t('auth.register.dateOfBirth')}</label>
                  <IconField icon={CalendarDays}>
                    <input type="date" required max={maxDateOfBirth()} value={form.date_of_birth} onChange={update('date_of_birth')} className={inputClass} style={inputStyle} />
                  </IconField>
                </div>
                <div>
                  <label className={authLabelClass}>{t('auth.register.country')}</label>
                  <IconField icon={Globe2}>
                    <select required value={form.country} onChange={update('country')} className={inputClass} style={inputStyle}>
                      <option value="" disabled>{t('profile.select')}</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </IconField>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('account')} className="lp-btn-secondary w-full" style={{ height: '2.75rem', fontSize: '0.9rem' }}>{t('auth.register.back')}</button>
                  <button type="submit" className="lp-btn-primary w-full" style={{ height: '2.75rem', fontSize: '0.9rem' }}>{t('auth.register.continue')}</button>
                </div>
              </form>
            </>
          )}

          {step === 'languages' && (
            <>
              <StepHeader icon={Languages} title={t('auth.register.step3Title')} subtitle={t('auth.register.step3Subtitle')} />
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className={authLabelClass}>{t('auth.register.nativeLanguage')}</label>
                  <IconField icon={Languages}>
                    <select value={form.native_language} onChange={update('native_language')} className={inputClass} style={inputStyle}>
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </IconField>
                </div>
                <div className="grid grid-cols-[1.6fr_1fr] gap-3">
                  <div>
                    <label className={authLabelClass}>{t('auth.register.canTeach')}</label>
                    <IconField icon={Languages}>
                      <select value={form.spoken_language} onChange={update('spoken_language')} className={inputClass} style={inputStyle}>
                        <option value="">{t('auth.register.none')}</option>
                        {LANGUAGES.filter((l) => l !== form.native_language && l !== form.learning_language).map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </IconField>
                  </div>
                  <div>
                    <label className={authLabelClass}>{t('auth.register.myLevel')}</label>
                    <IconField icon={Sparkles}>
                      <select disabled={!form.spoken_language} value={form.spoken_level} onChange={update('spoken_level')} className={`${inputClass} disabled:opacity-50`} style={inputStyle}>
                        {MATERIAL_LEVELS.slice(2).map((lv) => <option key={lv} value={lv}>{lv}</option>)}
                      </select>
                    </IconField>
                  </div>
                </div>
                <div className="grid grid-cols-[1.6fr_1fr] gap-3">
                  <div>
                    <label className={authLabelClass}>{t('auth.register.wantToLearn')}</label>
                    <IconField icon={Languages}>
                      <select value={form.learning_language} onChange={update('learning_language')} className={inputClass} style={inputStyle}>
                        {LANGUAGES.filter((l) => l !== form.native_language && l !== form.spoken_language).map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </IconField>
                  </div>
                  <div>
                    <label className={authLabelClass}>{t('auth.register.myLevel')}</label>
                    <IconField icon={Sparkles}>
                      <select value={form.learning_level} onChange={update('learning_level')} className={inputClass} style={inputStyle}>
                        {MATERIAL_LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
                      </select>
                    </IconField>
                  </div>
                </div>
                {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('about')} className="lp-btn-secondary w-full" style={{ height: '2.75rem', fontSize: '0.9rem' }}>{t('auth.register.back')}</button>
                  <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50" style={{ height: '2.75rem', fontSize: '0.9rem' }}>
                    {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  )
}
