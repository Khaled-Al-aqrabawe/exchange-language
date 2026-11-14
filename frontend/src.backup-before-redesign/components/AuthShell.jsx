import { useTranslation } from 'react-i18next'
import AuthImagePanel from './AuthImagePanel'

export const authInputClass = 'w-full rounded-2xl ps-11 pe-4 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
export const authInputStyle = { border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)', height: '2.75rem' }
export const authLabelClass = 'mb-1.5 block text-[13px] font-semibold'

export function AuthStepHeader({ icon: Icon, title, subtitle }) {
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

// Split-screen layout shared by the sign up and password reset pages: brand panel on the
// left, form on the right (the login page uses the same panel).
export default function AuthShell({ children }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[1.05fr_1fr]">
      <AuthImagePanel quote={t('auth.login.quote')} />
      <div className="relative flex items-center justify-center px-6 py-8 lp-hero-bg">
        <div className="relative w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
