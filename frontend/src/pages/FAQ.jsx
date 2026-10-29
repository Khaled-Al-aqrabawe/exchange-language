import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AuthHeroBackground from '../components/AuthHeroBackground'

const faqKeys = ['free', 'matching', 'install', 'coursesOnly']

export default function FAQ() {
  const { t } = useTranslation()
  const [openKey, setOpenKey] = useState(faqKeys[0])

  return (
    <div className="relative">
      <AuthHeroBackground />

      <div className="lp-hero-bg">
        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-10 text-center lp-animate-in" style={{ color: 'var(--ink)' }}>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="lp-gradient-text">{t('faq.title')}</span>
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-20 space-y-3">
        {faqKeys.map((key, i) => {
          const isOpen = openKey === key
          return (
            <div
              key={key}
              className={`lp-surface overflow-hidden lp-animate-in lp-delay-${i + 1}`}
              style={{ borderColor: isOpen ? 'color-mix(in srgb, var(--accent) 35%, var(--line))' : 'var(--line)' }}
            >
              <button
                onClick={() => setOpenKey(isOpen ? null : key)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start"
              >
                <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>{t(`faq.items.${key}.q`)}</h3>
                <ChevronDown
                  size={18}
                  className="shrink-0 transition-transform duration-300"
                  style={{ color: 'var(--accent)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                    {t(`faq.items.${key}.a`)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
