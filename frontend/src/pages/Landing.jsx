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

            <h1 className="text-4xl sm:text-5xl lg:text-[3.1rem] font-extrabold leading-[1.1]">
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
      <section style={{ background: 'color-mix(in srgb, var(--accent) 5%, var(--bg))' }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14 lp-animate-in">
            <p className="lp-eyebrow lp-eyebrow--center">{t('landing.howItWorks')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={step.n} className={`lp-card lp-card--hover lp-animate-in lp-delay-${i + 1}`} style={{ padding: '2rem' }}>
                <div className="flex items-center justify-between mb-6">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl font-display text-lg font-extrabold"
                    style={{ background: i === 1 ? 'color-mix(in srgb, var(--gold) 16%, var(--surface))' : 'color-mix(in srgb, var(--accent) 14%, var(--surface))', color: i === 1 ? 'var(--accent-2)' : 'var(--accent)' }}
                  >
                    {step.n}
                  </span>
                  <step.icon size={24} strokeWidth={1.75} style={{ color: 'var(--ink-soft)' }} />
                </div>
                <h3 className="font-display text-xl font-bold mb-2.5">{step.title}</h3>
                <p className="leading-relaxed text-[15px]" style={{ color: 'var(--ink-soft)' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section>
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
                <li key={item} className="flex items-start gap-3 text-[15px] font-medium">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 15%, var(--surface))', color: 'var(--accent)' }}>
                    <ShieldCheck size={14} strokeWidth={2.25} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-14 lp-animate-in">
            <p className="lp-eyebrow mb-5">{t('landing.everythingIncluded')}</p>
            <h2 className="text-4xl font-semibold leading-tight">{t('landing.featuresHeadline')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={f.title} className={`lp-card lp-card--hover lp-animate-in lp-delay-${(i % 6) + 1}`} style={{ padding: '2rem' }}>
                <span
                  className="flex h-12 w-12 items-center justify-center mb-5 rounded-2xl"
                  style={{ background: i % 2 ? 'color-mix(in srgb, var(--gold) 16%, var(--surface))' : 'color-mix(in srgb, var(--accent) 14%, var(--surface))', color: i % 2 ? 'var(--accent-2)' : 'var(--accent)' }}
                >
                  <f.icon size={22} strokeWidth={1.9} />
                </span>
                <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section>
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
