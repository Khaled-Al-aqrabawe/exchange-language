import { useTranslation } from 'react-i18next'
import AuthImagePanel from './AuthImagePanel'

export const authInputClass = 'w-full ps-10! pe-4! text-sm'
export const authInputStyle = { borderRadius: 'var(--radius-control)', height: '2.75rem' }
export const authLabelClass = 'mb-1.5 block text-[13px] font-medium'

export function AuthStepHeader({ icon: Icon, title, subtitle }) {
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

// Split-screen layout shared by the sign up and password reset pages: brand panel on the
// left, form on the right (the login page uses the same panel).
export default function AuthShell({ children }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[1.05fr_1fr]">
      <AuthImagePanel quote={t('auth.login.quote')} />
      <div className="relative flex items-center justify-center px-6 py-12" style={{ background: '#F8FAFC' }}>
        <div className="relative w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
