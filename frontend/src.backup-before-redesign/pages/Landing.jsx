import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
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

// Decorative greetings (not UI copy, so not run through i18n)
const GREETINGS = ['Hello', 'مرحبا', 'Bonjour', 'Hola', 'Hallo', 'Merhaba', 'Ciao', '你好', 'こんにちは', 'Olá']

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
      {/* Hero */}
      <section className="relative overflow-hidden lp-hero-bg">
        <div className="pointer-events-none absolute -top-24 end-[-8rem] h-[26rem] w-[26rem] rounded-full blur-3xl lp-blob-drift" style={{ background: 'color-mix(in srgb, var(--accent) 22%, transparent)' }} />
        <div className="pointer-events-none absolute bottom-[-8rem] start-[-6rem] h-[22rem] w-[22rem] rounded-full blur-3xl lp-blob-drift" style={{ background: 'color-mix(in srgb, var(--gold) 20%, transparent)', animationDelay: '3s' }} />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 sm:pt-24 lg:grid-cols-[1.05fr_1fr]">
          <div className="lp-animate-in">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))' }}
            >
              <Sparkles size={15} /> {t('landing.badge')}
            </span>

            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] sm:text-6xl lg:text-[4rem]">
              {t('landing.heroTitleLine1')}
              <br />
              <span className="lp-gradient-text" style={{ background: 'linear-gradient(90deg, var(--accent), var(--gold))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {t('landing.heroTitleLine2')}
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-[1.75]" style={{ color: 'var(--ink-soft)' }}>
              {t('landing.heroSubtitle')}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/register" className="lp-btn-primary" style={{ padding: '0.95rem 1.9rem', fontSize: '0.95rem' }}>
                {t('landing.getStartedFree')} <ArrowRight size={17} className="rtl:rotate-180" />
              </Link>
              <Link to="/about" className="lp-btn-secondary" style={{ padding: '0.95rem 1.9rem', fontSize: '0.95rem' }}>
                {t('landing.learnMore')}
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2.5 rtl:space-x-reverse">
                {learnerSeeds.map((seed) => (
                  <img key={seed} src={avatarUrl(seed, 64)} alt="" className="h-10 w-10 rounded-full object-cover ring-2" style={{ '--tw-ring-color': 'var(--bg)' }} />
                ))}
              </div>
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                <Trans i18nKey="landing.joinLearners" components={{ bold: <span className="font-semibold" style={{ color: 'var(--ink)' }} /> }} />
              </p>
            </div>
          </div>

          <div className="lp-animate-in lp-delay-2 relative">
            <CallPreview />
          </div>
        </div>
      </section>

      {/* Greetings strip */}
      <section style={{ background: 'linear-gradient(90deg, #0b3b3a, #0d9488 55%, #ff6b57)' }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-9 gap-y-2 px-6 py-5">
          {GREETINGS.map((g) => (
            <span key={g} className="font-display text-base font-semibold text-white/90 sm:text-lg">{g}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: 'color-mix(in srgb, var(--accent) 5%, var(--bg))' }}>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-14 text-center lp-animate-in">
            <p className="lp-eyebrow lp-eyebrow--center">{t('landing.howItWorks')}</p>
            <hr className="lp-rule mx-auto mt-4" />
          </div>
          <div className="relative grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.n} className={`lp-card lp-card--hover lp-animate-in lp-delay-${i + 1} relative overflow-hidden`} style={{ padding: '2.25rem 2rem' }}>
                <span
                  className="pointer-events-none absolute -top-4 end-4 select-none font-display text-[6.5rem] font-extrabold leading-none"
                  style={{ color: 'color-mix(in srgb, var(--accent) 9%, transparent)' }}
                >
                  {step.n}
                </span>
                <span
                  className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                  style={{ background: i === 1 ? 'linear-gradient(135deg, #ff6b57, #e8503a)' : 'var(--gradient-brand)', boxShadow: 'var(--btn-shadow)' }}
                >
                  <step.icon size={26} strokeWidth={1.9} />
                </span>
                <h3 className="relative mb-2.5 font-display text-xl font-bold">{step.title}</h3>
                <p className="relative text-[15px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-20 px-6 py-24 lg:grid-cols-2">
          <div className="order-2 flex justify-center lp-animate-in-scale lg:order-1">
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] blur-2xl" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--gold) 20%, transparent))' }} />
              <div className="relative"><MessageMockup /></div>
            </div>
          </div>
          <div className="order-1 lp-animate-in lg:order-2">
            <p className="lp-eyebrow mb-5">{t('landing.realConversations')}</p>
            <h2 className="mb-5 text-4xl font-bold leading-tight">{t('landing.practiceHeadline')}</h2>
            <p className="mb-8 text-lg leading-[1.75]" style={{ color: 'var(--ink-soft)' }}>{t('landing.practiceBody')}</p>
            <ul className="space-y-4">
              {practiceList.map((item) => (
                <li key={item} className="flex items-start gap-3 text-base font-medium">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: 'var(--gradient-brand)' }}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: 'var(--surface-2)' }}>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-14 max-w-2xl lp-animate-in">
            <p className="lp-eyebrow mb-5">{t('landing.everythingIncluded')}</p>
            <h2 className="text-4xl font-bold leading-tight">{t('landing.featuresHeadline')}</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => {
              const dark = i === 0 || i === 4
              return (
                <div
                  key={f.title}
                  className={`lp-card lp-card--hover lp-animate-in lp-delay-${(i % 6) + 1} ${f.wide ? 'lg:col-span-2' : ''}`}
                  style={{
                    padding: '2rem',
                    ...(dark ? { background: i === 0 ? 'linear-gradient(135deg, #0b3b3a, #0d9488)' : 'linear-gradient(135deg, #ff6b57, #e8503a)', border: 'none', color: '#fff' } : {}),
                  }}
                >
                  <span
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={dark
                      ? { background: 'rgb(255 255 255 / 0.18)', color: '#fff' }
                      : { background: i % 2 ? 'color-mix(in srgb, var(--gold) 16%, var(--surface))' : 'color-mix(in srgb, var(--accent) 14%, var(--surface))', color: i % 2 ? 'var(--accent-2)' : 'var(--accent)' }}
                  >
                    <f.icon size={22} strokeWidth={1.9} />
                  </span>
                  <h3 className="mb-2 font-display text-lg font-bold">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: dark ? 'rgb(255 255 255 / 0.85)' : 'var(--ink-soft)' }}>{f.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="lp-navy-panel bg-dots px-8 py-20 text-center lp-animate-in-scale" style={{ background: 'linear-gradient(135deg, #0b3b3a 0%, #0d9488 60%, #ff6b57 130%)', color: '#fff' }}>
            <div className="relative">
              <h2 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ color: '#fff' }}>
                {t('landing.ctaTitle')}
              </h2>
              <p className="mx-auto mb-10 max-w-md leading-relaxed" style={{ color: 'rgb(255 255 255 / 0.82)' }}>{t('landing.ctaBody')}</p>
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
