import { useTranslation } from 'react-i18next'

const faqKeys = ['free', 'matching', 'install', 'coursesOnly']

export default function FAQ() {
  const { t } = useTranslation()

  return (
    <div className="max-w-3xl mx-auto px-6 py-20" style={{ color: 'var(--ink)' }}>
      <p className="lp-eyebrow mb-4" style={{ color: 'var(--accent)' }}>{t('faq.eyebrow')}</p>
      <h1 className="font-display text-4xl font-extrabold tracking-tight mb-12">{t('faq.title')}</h1>
      <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
        {faqKeys.map((key) => (
          <div key={key} className="py-7 first:pt-0" style={{ borderColor: 'var(--line)' }}>
            <h3 className="font-semibold text-lg mb-2">{t(`faq.items.${key}.q`)}</h3>
            <p className="leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{t(`faq.items.${key}.a`)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
