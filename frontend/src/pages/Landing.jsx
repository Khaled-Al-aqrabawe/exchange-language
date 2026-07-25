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
import AuthHeroBackground from '../components/AuthHeroBackground'
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
      <AuthHeroBackground />

      {/* Hero */}
      <section className="relative overflow-hidden lp-hero-bg">
        <div className="relative max-w-6xl mx-auto px-6 pt-16 sm:pt-20 pb-24 grid lg:grid-cols-2 gap-14 items-center">
          <div className="lp-animate-in">
            <span
              className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium mb-6"
              style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', color: 'var(--ink-soft)', background: 'var(--surface)' }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full lp-blob-drift" style={{ background: 'var(--accent-2)', opacity: 0.6 }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-2)' }} />
              </span>
              {t('landing.badge')}
            </span>

            <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
              {t('landing.heroTitleLine1')}
              <br />
              <span className="lp-gradient-text">{t('landing.heroTitleLine2')}</span>
            </h1>

            <p className="mt-6 text-lg max-w-xl leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
              {t('landing.heroSubtitle')}
            </p>

            <div className="mt-9 flex items-center gap-3 flex-wrap">
              {user ? (
                <Link to="/partners" className="lp-btn-primary">
                  {t('landing.findAPartner')} <ArrowRight size={17} className="rtl:rotate-180" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="lp-btn-primary">
                    {t('landing.getStartedFree')} <ArrowRight size={17} className="rtl:rotate-180" />
                  </Link>
                  <Link to="/about" className="lp-btn-secondary">
                    {t('landing.learnMore')}
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-3 rtl:space-x-reverse">
                {learnerSeeds.map((seed) => (
                  <img key={seed} src={avatarUrl(seed, 64)} alt="" className="h-9 w-9 rounded-full ring-2 object-cover" style={{ '--tw-ring-color': 'var(--surface)' }} />
                ))}
              </div>
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                <Trans i18nKey="landing.joinLearners" components={{ bold: <span className="font-medium" style={{ color: 'var(--ink)' }} /> }} />
              </p>
            </div>
          </div>

          <div className="lp-animate-in lp-delay-2">
            <CallPreview />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-6 py-20">
          <p className="lp-eyebrow mb-10 lp-animate-in" style={{ color: 'var(--accent)' }}>{t('landing.howItWorks')}</p>
          <div className="relative">
            <div
              className="absolute top-0 bottom-0 hidden sm:block"
              style={{ insetInlineStart: '39px', width: '2px', background: 'linear-gradient(var(--accent), var(--accent-2))', opacity: 0.25 }}
            />
            {steps.map((step, i) => (
              <div
                key={step.n}
                className={`relative grid sm:grid-cols-[80px_1fr] gap-4 sm:gap-8 py-8 first:pt-0 last:pb-0 lp-animate-in lp-delay-${i + 1}`}
              >
                <div className="relative flex sm:justify-center">
                  <span
                    className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl shrink-0"
                    style={{ background: 'var(--gradient-brand)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-card)' }}
                  >
                    <step.icon size={22} />
                  </span>
                </div>
                <div>
                  <span className="lp-eyebrow" style={{ color: 'var(--accent-2)' }}>{step.n}</span>
                  <h3 className="font-semibold text-lg mt-1 mb-1.5">{step.title}</h3>
                  <p className="leading-relaxed max-w-md" style={{ color: 'var(--ink-soft)' }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex justify-center order-2 lg:order-1 lp-animate-in-scale">
            <MessageMockup />
          </div>
          <div className="order-1 lg:order-2 lp-animate-in">
            <p className="lp-eyebrow mb-2" style={{ color: 'var(--accent-2)' }}>{t('landing.realConversations')}</p>
            <p className="font-display text-3xl font-bold tracking-tight mb-4">{t('landing.practiceHeadline')}</p>
            <p className="leading-relaxed mb-6" style={{ color: 'var(--ink-soft)' }}>{t('landing.practiceBody')}</p>
            <ul className="space-y-3">
              {practiceList.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-2)' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-5xl mx-auto px-6 py-20">
          <p className="lp-eyebrow mb-2 lp-animate-in" style={{ color: 'var(--accent)' }}>{t('landing.everythingIncluded')}</p>
          <p className="font-display text-3xl font-bold tracking-tight mb-12 lp-animate-in">{t('landing.featuresHeadline')}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`relative overflow-hidden lp-card lp-card--hover lp-animate-in lp-delay-${(i % 6) + 1} ${f.big ? 'lg:col-span-2' : ''}`}
              >
                {f.big && (
                  <span
                    className="pointer-events-none absolute -bottom-8 -end-8 h-32 w-32 rounded-full blur-2xl"
                    style={{ background: 'var(--gradient-brand)', opacity: 0.14 }}
                  />
                )}
                <span className="lp-icon-badge h-10 w-10 mb-4">
                  <f.icon size={19} strokeWidth={2} />
                </span>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--ink-soft)' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div
            className="relative overflow-hidden rounded-3xl bg-dots px-8 py-16 text-center lp-animate-in-scale"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <span className="pointer-events-none absolute -top-16 -start-16 h-64 w-64 rounded-full blur-3xl lp-blob-drift" style={{ background: 'rgb(255 255 255 / 0.25)' }} />
            <span className="pointer-events-none absolute -bottom-16 -end-16 h-64 w-64 rounded-full blur-3xl lp-blob-drift" style={{ background: 'rgb(0 0 0 / 0.15)', animationDelay: '4s' }} />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
                {t('landing.ctaTitle')}
              </h2>
              <p className="max-w-md mx-auto mb-8" style={{ color: 'rgb(255 255 255 / 0.85)' }}>{t('landing.ctaBody')}</p>
              {!user && (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white font-semibold hover:opacity-90 transition-opacity"
                  style={{ color: 'var(--accent)' }}
                >
                  {t('landing.ctaButton')} <ArrowRight size={17} className="rtl:rotate-180" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
