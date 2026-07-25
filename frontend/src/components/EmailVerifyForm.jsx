import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

const inputClass = 'w-full rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

export default function EmailVerifyForm({ email, onVerified }) {
  const { t } = useTranslation()
  const { verifyEmail, resendVerification } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resent, setResent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await verifyEmail(email, code)
      onVerified()
    } catch {
      setError(t('auth.verifyEmail.invalidCode'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResent(false)
    await resendVerification(email)
    setResent(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>{t('auth.verifyEmail.codeLabel')}</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder={t('auth.verifyEmail.codePlaceholder')}
        />
      </div>
      {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
      <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50">
        {submitting ? t('auth.verifyEmail.verifying') : t('auth.verifyEmail.verify')}
      </button>
      <button type="button" onClick={handleResend} disabled={resent} className="text-sm font-semibold w-full disabled:opacity-50" style={{ color: 'var(--accent)' }}>
        {resent ? t('auth.register.resent') : t('auth.register.resend')}
      </button>
    </form>
  )
}
