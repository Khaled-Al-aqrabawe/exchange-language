import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  Check,
  Clock3,
  Compass,
  Target,
  MessageCircle,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import HeroVideo from '../components/HeroVideo'
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
    { icon: Video, title: t('landing.features.videoTitle'), body: t('landing.features.videoBody'), wide: true },
    { icon: Users, title: t('landing.features.matchingTitle'), body: t('landing.features.matchingBody') },
    { icon: MessageCircle, title: t('landing.features.messagingTitle'), body: t('landing.features.messagingBody') },
    { icon: CalendarClock, title: t('landing.features.schedulingTitle'), body: t('landing.features.schedulingBody') },
    { icon: BookOpenCheck, title: t('landing.features.coursesTitle'), body: t('landing.features.coursesBody'), wide: true },
    { icon: ShieldCheck, title: t('landing.features.freeTitle'), body: t('landing.features.freeBody') },
  ]

  const practiceList = [
    t('landing.practiceList.matched'),
    t('landing.practiceList.builtin'),
    t('landing.practiceList.free'),
  ]

  return (
    <div className="relative" style={{ color: 'var(--ink)' }}>
      {/* Hero: dark, full width, big headline */}
      <section style={{ background: 'linear-gradient(135deg, #1E293B 0%, #2e1a66 60%, #4c2a9c 100%)', color: '#fff' }}>
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 sm:pt-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="lp-animate-in">
            <h1 className="lp-serif text-[2.75rem] leading-[1.08] sm:text-[4rem]" style={{ color: '#fff' }}>
              {t('landing.heroTitleLine1')}
              <br />
              <span style={{ color: '#fb7185' }}>{t('landing.heroTitleLine2')}</span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed" style={{ color: 'rgb(255 255 255 / 0.78)' }}>
              {t('landing.heroSubtitle')}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/register" className="lp-cta-mint">
                {t('landing.getStartedFree')} <ArrowRight size={17} className="rtl:rotate-180" />
              </Link>
              <Link to="/about" className="lp-cta-ghost">{t('landing.learnMore')}</Link>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {learnerSeeds.map((seed) => (
                  <img key={seed} src={avatarUrl(seed, 64)} alt="" className="lp-avatar h-9 w-9" style={{ outline: '2px solid #2e1a66' }} />
                ))}
              </div>
              <p className="text-sm" style={{ color: 'rgb(255 255 255 / 0.75)' }}>
                <Trans i18nKey="landing.joinLearners" components={{ bold: <span className="font-semibold" style={{ color: '#fff' }} /> }} />
              </p>
            </div>
          </div>
          <div className="lp-animate-in lp-delay-2 relative">
            <HeroVideo />
          </div>
        </div>
      </section>

      {/* Highlights strip */}
      <section style={{ background: '#F43F5E', color: '#fff' }}>
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-5 sm:grid-cols-3">
          {[
            [BarChart3, t('landing.strip.levels')],
            [Users, t('landing.strip.native')],
            [Clock3, t('landing.strip.anytime')],
          ].map(([Icon, label]) => (
            <div key={label} className="flex items-center justify-center gap-3 text-[15px] font-semibold sm:justify-start">
              <Icon size={22} strokeWidth={2} /> {label}
            </div>
          ))}
        </div>
      </section>

      {/* Start with your goals */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="lp-serif mx-auto max-w-2xl text-[2.25rem] leading-tight sm:text-[2.75rem]">{t('landing.goals.title')}</h2>
          <p className="lp-lede mx-auto mt-5 max-w-2xl">{t('landing.goals.body')}</p>
          <Link to="/register" className="lp-btn-primary lp-btn-lg mt-8">{t('landing.goals.cta')}</Link>

          <div className="mt-14 grid gap-5 text-start md:grid-cols-2">
            {[
              { bg: '#f4d9cf', title: t('landing.goals.card1Title'), body: t('landing.goals.card1Body'), icon: Target },
              { bg: '#ede9fe', title: t('landing.goals.card2Title'), body: t('landing.goals.card2Body'), icon: Compass },
            ].map((c) => (
              <div key={c.title} className="flex min-h-[19rem] flex-col justify-between p-8" style={{ background: c.bg, borderRadius: 'var(--radius-card)', color: '#17191d' }}>
                <div>
                  <h3 className="lp-serif text-2xl">{c.title}</h3>
                  <p className="mt-3 max-w-sm text-[15px] leading-relaxed" style={{ opacity: 0.78 }}>{c.body}</p>
                </div>
                <c.icon size={64} strokeWidth={1.2} style={{ opacity: 0.55 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: '#1E293B', color: '#fff' }}>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="lp-serif lp-animate-in mb-12 text-center text-[2.25rem] sm:text-[2.75rem]" style={{ color: '#fff' }}>{t('landing.howItWorks')}</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className={`lp-animate-in lp-delay-${i + 1} p-8`}
                style={{ background: ['#f4d9cf', '#ede9fe', '#FFF1F2'][i], color: '#17191d', borderRadius: 'var(--radius-card)' }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <step.icon size={34} strokeWidth={1.5} style={{ opacity: 0.7 }} />
                  <span className="lp-nums font-mono text-sm" style={{ opacity: 0.55 }}>{step.n}</span>
                </div>
                <h3 className="lp-serif mb-2 text-xl">{step.title}</h3>
                <p className="text-[15px] leading-relaxed" style={{ opacity: 0.78 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section style={{ background: '#FFF1F2', color: '#1E293B' }}>
        <div className="mx-auto max-w-3xl px-6 py-24 lp-animate-in">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ opacity: 0.65 }}>{t('landing.realConversations')}</p>
          <h2 className="lp-serif mb-4 text-[2.25rem] leading-tight sm:text-[2.75rem]">{t('landing.practiceHeadline')}</h2>
          <p className="mb-8 text-[17px] leading-relaxed" style={{ opacity: 0.8 }}>{t('landing.practiceBody')}</p>
          <ul className="overflow-hidden" style={{ background: '#fff', borderRadius: 'var(--radius-card)' }}>
            {practiceList.map((item, i) => (
              <li key={item} className="flex items-start gap-3 px-5 py-4 text-[15px]" style={{ borderTop: i ? '1px solid #e3e1dc' : undefined }}>
                <Check size={17} strokeWidth={2.6} className="mt-0.5 shrink-0" style={{ color: '#1f9d82' }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-12 max-w-2xl lp-animate-in">
            <p className="lp-eyebrow mb-4">{t('landing.everythingIncluded')}</p>
            <h2 className="lp-serif text-[2.25rem] leading-tight sm:text-[2.75rem]">{t('landing.featuresHeadline')}</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`lp-animate-in lp-delay-${(i % 6) + 1} p-7 ${f.wide ? 'lg:col-span-2' : ''}`}
                style={{ background: ['#f4d9cf', '#ede9fe', '#ede9fe', '#FFF1F2', '#f4d9cf', '#FFF1F2'][i % 6], color: '#17191d', borderRadius: 'var(--radius-card)' }}
              >
                <f.icon size={28} strokeWidth={1.6} className="mb-5" style={{ opacity: 0.7 }} />
                <h3 className="lp-serif mb-1.5 text-xl">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ opacity: 0.78 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: 'linear-gradient(135deg, #1E293B 0%, #2e1a66 60%, #4c2a9c 100%)', color: '#fff' }}>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center lp-animate-in">
          <h2 className="lp-serif mb-4 text-[2.25rem] sm:text-[2.75rem]" style={{ color: '#fff' }}>{t('landing.ctaTitle')}</h2>
          <p className="mx-auto mb-9 max-w-xl text-[17px] leading-relaxed" style={{ color: 'rgb(255 255 255 / 0.78)' }}>{t('landing.ctaBody')}</p>
          <Link to="/register" className="lp-cta-mint">
            {t('landing.ctaButton')} <ArrowRight size={17} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  )
}
