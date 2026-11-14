import { HelpCircle, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const faqKeys = ['free', 'matching', 'install', 'coursesOnly']

export default function FAQ() {
  const { t } = useTranslation()
  const [openKey, setOpenKey] = useState(faqKeys[0])

  return (
    <div className="relative" style={{ color: 'var(--ink)' }}>
      <div className="lp-hero-bg">
        <div className="pointer-events-none absolute -top-20 start-1/2 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl lp-blob-drift" style={{ background: 'color-mix(in srgb, var(--gold) 18%, transparent)' }} />
        <div className="relative mx-auto max-w-3xl px-6 pb-14 pt-20 text-center lp-animate-in">
          <span className="lp-icon-badge mb-5 h-14 w-14"><HelpCircle size={26} /></span>
          <p className="lp-eyebrow mb-3" style={{ color: 'var(--accent)' }}>{t('faq.eyebrow')}</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{t('faq.title')}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-6 pb-24">
        {faqKeys.map((key, i) => {
          const isOpen = openKey === key
          return (
            <div
              key={key}
              className={`lp-card overflow-hidden lp-animate-in lp-delay-${i + 1}`}
              style={{
                padding: 0,
                borderColor: isOpen ? 'color-mix(in srgb, var(--accent) 45%, var(--line))' : 'var(--line)',
                boxShadow: isOpen ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
              }}
            >
              <button
                onClick={() => setOpenKey(isOpen ? null : key)}
                className="flex w-full items-center gap-4 px-6 py-5 text-start"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-extrabold"
                  style={isOpen ? { background: 'var(--gradient-brand)', color: '#fff' } : { background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', color: 'var(--accent)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="flex-1 text-base font-semibold sm:text-lg">{t(`faq.items.${key}.q`)}</h3>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={isOpen ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }}
                >
                  {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                </span>
              </button>
              <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 ps-[4.75rem] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                    {t(`faq.items.${key}.a`)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        <div className="lp-animate-in pt-8 text-center">
          <Link to="/register" className="lp-btn-primary">{t('landing.getStartedFree')}</Link>
        </div>
      </div>
    </div>
  )
}
