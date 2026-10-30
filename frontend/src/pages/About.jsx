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
        <div className="pointer-events-none absolute -top-20 start-1/2 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl lp-blob-drift" style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)' }} />
        <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-20 text-center lp-animate-in">
          <span
            className="inline-flex rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))' }}
          >
            {t('about.eyebrow')}
          </span>
          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
            {t('about.titlePrefix')}{' '}
            <span style={{ background: 'linear-gradient(90deg, var(--accent), var(--gold))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {t('about.titleHighlight')}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{t('about.intro')}</p>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 lg:grid-cols-2">
          <div className="flex justify-center lp-animate-in-scale">
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] blur-2xl" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--gold) 20%, transparent))' }} />
              <div className="relative"><MessageMockup /></div>
            </div>
          </div>
          <div className="lp-animate-in">
            <p className="lp-eyebrow mb-4" style={{ color: 'var(--gold)' }}>{t('about.missionEyebrow')}</p>
            <h2 className="mb-5 font-display text-4xl font-bold leading-tight tracking-tight">{t('about.missionHeadline')}</h2>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{t('about.missionBody')}</p>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--surface-2)' }}>
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="lp-eyebrow mb-3 text-center lp-animate-in" style={{ color: 'var(--accent)' }}>{t('about.beliefEyebrow')}</p>
          <h2 className="mb-14 text-center font-display text-4xl font-bold tracking-tight lp-animate-in">{t('about.beliefHeadline')}</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {values.map((v, i) => (
              <div key={v.title} className={`lp-card lp-card--hover lp-animate-in lp-delay-${i + 1}`} style={{ padding: '2rem' }}>
                <span
                  className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl text-white"
                  style={{ width: '3.25rem', height: '3.25rem', background: i === 1 ? 'linear-gradient(135deg, #ff6b57, #e8503a)' : 'var(--gradient-brand)' }}
                >
                  <v.icon size={24} strokeWidth={1.9} />
                </span>
                <h3 className="mb-2 text-lg font-bold">{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="lp-navy-panel bg-dots px-8 py-16 text-center" style={{ background: 'linear-gradient(135deg, #0b3b3a 0%, #0d9488 60%, #ff6b57 130%)', color: '#fff' }}>
            <div className="relative">
              <h2 className="mb-4 text-4xl font-bold" style={{ color: '#fff' }}>{t('landing.ctaTitle')}</h2>
              <p className="mx-auto mb-9 max-w-md leading-relaxed" style={{ color: 'rgb(255 255 255 / 0.82)' }}>{t('landing.ctaBody')}</p>
              <Link to="/register" className="lp-btn-gold" style={{ background: '#fff', color: '#0b3b3a' }}>
                {t('landing.ctaButton')} <ArrowRight size={16} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
