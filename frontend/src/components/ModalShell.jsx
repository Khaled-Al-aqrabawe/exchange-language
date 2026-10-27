import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Shared look for the app's pop-up forms: a glass card with a gradient top edge, a header,
// a scrolling body and a footer that stays in view.
export default function ModalShell({ icon: Icon, title, subtitle, onClose, children, footer }) {
  const { t } = useTranslation()
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto px-4 py-6 backdrop-blur-sm lp-animate-in-fade"
      style={{ background: 'color-mix(in srgb, #02030c 70%, transparent)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="lp-animate-in-scale relative my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px]"
        style={{
          background: 'linear-gradient(180deg, color-mix(in srgb, #fff 5%, var(--surface)), var(--surface))',
          border: '1px solid var(--line)',
          boxShadow: '0 40px 90px -30px rgb(80 60 230 / 0.55)',
        }}
      >
        <div className="h-1.5 shrink-0" style={{ background: 'linear-gradient(90deg, var(--accent), var(--gold))' }} />

        <div className="flex shrink-0 items-start gap-4 px-6 pb-3 pt-5">
          <span className="lp-icon-badge h-12 w-12 shrink-0"><Icon size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold leading-tight" style={{ color: 'var(--ink)' }}>{title}</h2>
            {subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
            style={{ color: 'var(--ink-soft)' }}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5 pt-2">{children}</div>

        {footer && (
          <div className="shrink-0 px-6 pb-6 pt-4" style={{ borderTop: '1px solid var(--line)' }}>{footer}</div>
        )}
      </div>
    </div>
  )
}

export const modalInputClass = 'h-12 w-full rounded-2xl px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
export const modalInputStyle = { background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink)' }

// A labelled form field; `icon` sits inside the left of the control
export function ModalField({ label, icon: Icon, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{label}</span>
      <span className="relative block">
        {Icon && <Icon size={16} className="pointer-events-none absolute start-4 top-1/2 z-10 -translate-y-1/2" style={{ color: 'var(--accent)' }} />}
        {children}
      </span>
      {hint && <span className="mt-1.5 block text-xs" style={{ color: 'var(--ink-soft)' }}>{hint}</span>}
    </label>
  )
}

// Small pill used for quick choices (Today, Tomorrow, 30 min ...)
export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
      style={active
        ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)' }
        : { background: 'var(--surface-2)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
    >
      {children}
    </button>
  )
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'var(--line)' }}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ insetInlineStart: checked ? '1.55rem' : '0.25rem' }}
      />
    </button>
  )
}

// 'YYYY-MM-DD' for today + `offset` days, in the user's own timezone
export function localDateString(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
