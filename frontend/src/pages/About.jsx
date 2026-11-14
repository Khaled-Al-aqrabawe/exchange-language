import { ArrowRight, Globe2, HeartHandshake, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import MessageMockup from '../components/MessageMockup'

export default function About() {
  const { t } = useTranslation()

  const values = [
    { icon: HeartHandshake, title: t('about.values.realTitle'), body: t('about.values.realBody') },
    { icon: Globe2, title: t('about.values.accessibleTitle'), body: t('about.values.accessibleBody') },
    { icon: Target, title: t('about.values.structureTitle'), body: t('about.values.structureBody') },
  ]

  return (
    <div className="relative" style={{ color: 'var(--ink)' }}>
      <section className="lp-hero-bg">
        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-16 lp-animate-in">
          <p className="lp-eyebrow mb-4">{t('about.eyebrow')}</p>
          <h1>
            {t('about.titlePrefix')}{' '}
            <span style={{ color: 'var(--ink-soft)' }}>{t('about.titleHighlight')}</span>
          </h1>
          <p className="lp-lede mt-5">{t('about.intro')}</p>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 lg:grid-cols-2">
          <div className="flex justify-center lp-animate-in-scale">
            <MessageMockup />
          </div>
          <div className="lp-animate-in">
            <p className="lp-eyebrow mb-4">{t('about.missionEyebrow')}</p>
            <h2 className="mb-4">{t('about.missionHeadline')}</h2>
            <p className="lp-lede">{t('about.missionBody')}</p>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--line)' }}>
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="lp-section-head lp-animate-in">
            <p className="lp-eyebrow">{t('about.beliefEyebrow')}</p>
          </div>
          <h2 className="mb-10 max-w-2xl lp-animate-in">{t('about.beliefHeadline')}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {values.map((v, i) => (
              <div key={v.title} className={`lp-card lp-card--hover lp-animate-in lp-delay-${i + 1}`} style={{ padding: '1.5rem' }}>
                <span className="lp-icon-badge mb-4 h-9 w-9">
                  <v.icon size={18} strokeWidth={1.9} />
                </span>
                <h3 className="mb-1.5">{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="mx-auto max-w-3xl px-6 py-20 text-center lp-animate-in">
          <h2 className="mb-4">{t('landing.ctaTitle')}</h2>
          <p className="lp-lede mx-auto mb-8">{t('landing.ctaBody')}</p>
          <Link to="/register" className="lp-btn-primary lp-btn-lg">
            {t('landing.ctaButton')} <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  )
}
