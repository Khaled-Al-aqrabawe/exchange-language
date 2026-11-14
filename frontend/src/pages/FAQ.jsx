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
        <div className="relative mx-auto max-w-3xl px-6 pb-12 pt-16 lp-animate-in">
          <span className="lp-icon-badge mb-5 h-9 w-9"><HelpCircle size={18} /></span>
          <p className="lp-eyebrow mb-3">{t('faq.eyebrow')}</p>
          <h1>{t('faq.title')}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-20 pt-12">
        <div className="lp-surface lp-rows lp-animate-in">
          {faqKeys.map((key, i) => {
            const isOpen = openKey === key
            return (
              <div key={key} className="overflow-hidden">
                <button
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-start"
                >
                  <span className="lp-nums font-mono text-xs shrink-0" style={{ color: 'var(--ink-faint)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="flex-1" style={{ color: isOpen ? 'var(--accent)' : 'var(--ink)' }}>{t(`faq.items.${key}.q`)}</h3>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center transition-colors"
                    style={{ borderRadius: 'var(--radius-tag)', border: '1px solid var(--line)', color: isOpen ? 'var(--accent)' : 'var(--ink-faint)' }}
                  >
                    {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                  </span>
                </button>
                <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 ps-[3.25rem] text-[15px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                      {t(`faq.items.${key}.a`)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="lp-animate-in mt-10 pt-8 text-center" style={{ borderTop: '1px solid var(--line)' }}>
          <Link to="/register" className="lp-btn-primary">{t('landing.getStartedFree')}</Link>
        </div>
      </div>
    </div>
  )
}
