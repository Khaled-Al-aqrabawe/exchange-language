import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  MessageCircle,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import CallPreview from '../components/CallPreview'
import MessageMockup from '../components/MessageMockup'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

const learnerSeeds = ['learner-1', 'learner-2', 'learner-3', 'learner-4', 'learner-5']

export default function Landing() {
  const { t } = useTranslation()
  const { user } = useAuth()

  if (user) return <Navigate to="/home" replace />

  const steps = [
    { n: '01', icon: Users, title: t('landing.steps.exchangeTitle'), body: t('landing.steps.exchangeBody') },
    { n: '02', icon: MessageCircle, title: t('landing.steps.practiceTitle'), body: t('landing.steps.practiceBody') },
    { n: '03', icon: BookOpenCheck, title: t('landing.steps.learnTitle'), body: t('landing.steps.learnBody') },
  ]

  const features = [
    { icon: Video, title: t('landing.features.videoTitle'), body: t('landing.features.videoBody'), big: true },
    { icon: Users, title: t('landing.features.matchingTitle'), body: t('landing.features.matchingBody') },
    { icon: MessageCircle, title: t('landing.features.messagingTitle'), body: t('landing.features.messagingBody') },
    { icon: CalendarClock, title: t('landing.features.schedulingTitle'), body: t('landing.features.schedulingBody') },
    { icon: BookOpenCheck, title: t('landing.features.coursesTitle'), body: t('landing.features.coursesBody'), big: true },
    { icon: ShieldCheck, title: t('landing.features.freeTitle'), body: t('landing.features.freeBody') },
  ]

  const practiceList = [
    t('landing.practiceList.matched'),
    t('landing.practiceList.builtin'),
    t('landing.practiceList.free'),
  ]

  return (
    <div className="relative" style={{ color: 'var(--ink)' }}>
      {/* Hero */}
      <section className="relative overflow-hidden lp-hero-bg">
        <div className="relative max-w-6xl mx-auto px-6 pt-20 sm:pt-24 pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-16 items-center">
          <div className="lp-animate-in">
            <p className="lp-eyebrow mb-7">{t('landing.badge')}</p>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.1]">
              {t('landing.heroTitleLine1')}
              <br />
              <span className="lp-gradient-text">{t('landing.heroTitleLine2')}</span>
            </h1>

            <hr className="lp-rule mt-8" />

            <p className="mt-7 text-[17px] max-w-xl leading-[1.75]" style={{ color: 'var(--ink-soft)' }}>
              {t('landing.heroSubtitle')}
            </p>

            <div className="mt-10 flex items-center gap-3 flex-wrap">
              <Link to="/register" className="lp-btn-primary">
                {t('landing.getStartedFree')} <ArrowRight size={16} className="rtl:rotate-180" />
              </Link>
              <Link to="/about" className="lp-btn-secondary">
                {t('landing.learnMore')}
              </Link>
            </div>

            <div className="mt-10 pt-8 flex items-center gap-4" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="flex -space-x-2.5 rtl:space-x-reverse">
                {learnerSeeds.map((seed) => (
                  <img key={seed} src={avatarUrl(seed, 64)} alt="" className="h-9 w-9 rounded-full ring-2 object-cover" style={{ '--tw-ring-color': 'var(--bg)' }} />
                ))}
              </div>
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                <Trans i18nKey="landing.joinLearners" components={{ bold: <span className="font-semibold" style={{ color: 'var(--ink)' }} /> }} />
              </p>
            </div>
          </div>

          <div className="lp-animate-in lp-delay-2">
            <CallPreview />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16 lp-animate-in">
            <p className="lp-eyebrow lp-eyebrow--center">{t('landing.howItWorks')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-x-12 gap-y-12">
            {steps.map((step, i) => (
              <div key={step.n} className={`lp-animate-in lp-delay-${i + 1}`} style={{ borderTop: '1px solid var(--line)', paddingTop: '1.75rem' }}>
                <div className="flex items-baseline justify-between mb-5">
                  <span className="font-display text-5xl font-semibold leading-none" style={{ color: 'var(--gold)' }}>{step.n}</span>
                  <step.icon size={22} strokeWidth={1.5} style={{ color: 'var(--ink-soft)' }} />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2.5">{step.title}</h3>
                <p className="leading-relaxed text-[15px]" style={{ color: 'var(--ink-soft)' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-20 items-center">
          <div className="flex justify-center order-2 lg:order-1 lp-animate-in-scale">
            <MessageMockup />
          </div>
          <div className="order-1 lg:order-2 lp-animate-in">
            <p className="lp-eyebrow mb-5">{t('landing.realConversations')}</p>
            <h2 className="text-4xl font-semibold leading-tight mb-5">{t('landing.practiceHeadline')}</h2>
            <p className="leading-[1.75] mb-8" style={{ color: 'var(--ink-soft)' }}>{t('landing.practiceBody')}</p>
            <ul className="space-y-4">
              {practiceList.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px]" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--line)' }}>
                  <ShieldCheck size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" style={{ color: 'var(--gold)' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-14 lp-animate-in">
            <p className="lp-eyebrow mb-5">{t('landing.everythingIncluded')}</p>
            <h2 className="text-4xl font-semibold leading-tight">{t('landing.featuresHeadline')}</h2>
          </div>
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3"
            style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-card)', overflow: 'hidden', gap: '1px', background: 'var(--line)' }}
          >
            {features.map((f, i) => (
              <div key={f.title} className={`p-8 lp-animate-in lp-delay-${(i % 6) + 1}`} style={{ background: 'var(--surface)' }}>
                <span className="flex h-11 w-11 items-center justify-center mb-6" style={{ border: '1px solid color-mix(in srgb, var(--gold) 55%, var(--line))', borderRadius: 'var(--radius-tag)', color: 'var(--gold)' }}>
                  <f.icon size={20} strokeWidth={1.6} />
                </span>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="lp-navy-panel bg-dots px-8 py-20 text-center lp-animate-in-scale">
            <div className="relative">
              <hr className="lp-rule mx-auto mb-8" />
              <h2 className="text-4xl sm:text-5xl font-semibold mb-4" style={{ color: 'var(--on-navy)' }}>
                {t('landing.ctaTitle')}
              </h2>
              <p className="max-w-md mx-auto mb-10 leading-relaxed" style={{ color: 'var(--on-navy-soft)' }}>{t('landing.ctaBody')}</p>
              <Link to="/register" className="lp-btn-gold">
                {t('landing.ctaButton')} <ArrowRight size={16} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
