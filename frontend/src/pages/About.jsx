import { Globe2, HeartHandshake, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MessageMockup from '../components/MessageMockup'

export default function About() {
  const { t } = useTranslation()

  const values = [
    { icon: HeartHandshake, title: t('about.values.realTitle'), body: t('about.values.realBody') },
    { icon: Globe2, title: t('about.values.accessibleTitle'), body: t('about.values.accessibleBody') },
    { icon: Target, title: t('about.values.structureTitle'), body: t('about.values.structureBody') },
  ]

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <p className="lp-eyebrow mb-4" style={{ color: 'var(--accent)' }}>{t('about.eyebrow')}</p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
          {t('about.titlePrefix')} <span style={{ color: 'var(--accent)' }}>{t('about.titleHighlight')}</span>
        </h1>
        <p className="mt-5 text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{t('about.intro')}</p>
      </section>

      <section style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex justify-center">
            <MessageMockup />
          </div>
          <div>
            <p className="lp-eyebrow mb-2" style={{ color: 'var(--accent)' }}>{t('about.missionEyebrow')}</p>
            <p className="font-display text-3xl font-bold tracking-tight mb-4">{t('about.missionHeadline')}</p>
            <p className="leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{t('about.missionBody')}</p>
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-5xl mx-auto px-6 py-20">
          <p className="lp-eyebrow mb-2" style={{ color: 'var(--accent)' }}>{t('about.beliefEyebrow')}</p>
          <p className="font-display text-3xl font-bold tracking-tight mb-12">{t('about.beliefHeadline')}</p>
          <div className="grid sm:grid-cols-3 gap-x-8 gap-y-10">
            {values.map((v) => (
              <div key={v.title} className="pt-5" style={{ borderTop: '1px solid var(--line)' }}>
                <v.icon size={20} strokeWidth={1.75} className="mb-3" style={{ color: 'var(--ink-soft)' }} />
                <h3 className="font-semibold mb-1.5">{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
