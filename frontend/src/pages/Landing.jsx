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
import { Link } from 'react-router-dom'
import CallPreview from '../components/CallPreview'
import MessageMockup from '../components/MessageMockup'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

const learnerSeeds = ['learner-1', 'learner-2', 'learner-3', 'learner-4', 'learner-5']

export default function Landing() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const steps = [
    { n: '01', title: t('landing.steps.exchangeTitle'), body: t('landing.steps.exchangeBody') },
    { n: '02', title: t('landing.steps.practiceTitle'), body: t('landing.steps.practiceBody') },
    { n: '03', title: t('landing.steps.learnTitle'), body: t('landing.steps.learnBody') },
  ]

  const features = [
    { icon: Video, title: t('landing.features.videoTitle'), body: t('landing.features.videoBody') },
    { icon: Users, title: t('landing.features.matchingTitle'), body: t('landing.features.matchingBody') },
    { icon: MessageCircle, title: t('landing.features.messagingTitle'), body: t('landing.features.messagingBody') },
    { icon: CalendarClock, title: t('landing.features.schedulingTitle'), body: t('landing.features.schedulingBody') },
    { icon: BookOpenCheck, title: t('landing.features.coursesTitle'), body: t('landing.features.coursesBody') },
    { icon: ShieldCheck, title: t('landing.features.freeTitle'), body: t('landing.features.freeBody') },
  ]

  const practiceList = [
    t('landing.practiceList.matched'),
    t('landing.practiceList.builtin'),
    t('landing.practiceList.free'),
  ]

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 pt-16 sm:pt-20 pb-24 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span
              className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium mb-6"
              style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', color: 'var(--ink-soft)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} /> {t('landing.badge')}
            </span>

            <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
              {t('landing.heroTitleLine1')}
              <br />
              <span style={{ color: 'var(--accent)' }}>{t('landing.heroTitleLine2')}</span>
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
                  <Link
                    to="/about"
                    className="px-5 py-2.5 font-semibold transition-colors hover:opacity-70"
                    style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-tag)', color: 'var(--ink)' }}
                  >
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

          <CallPreview />
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-6 py-20">
          <p className="lp-eyebrow mb-10" style={{ color: 'var(--accent)' }}>{t('landing.howItWorks')}</p>
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {steps.map((step) => (
              <div key={step.n} className="grid sm:grid-cols-[80px_1fr] gap-4 sm:gap-8 py-8 first:pt-0 last:pb-0" style={{ borderColor: 'var(--line)' }}>
                <span className="font-display text-4xl font-bold tabular-nums opacity-20">{step.n}</span>
                <div>
                  <h3 className="font-semibold text-lg mb-1.5">{step.title}</h3>
                  <p className="leading-relaxed max-w-md" style={{ color: 'var(--ink-soft)' }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section style={{ borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex justify-center order-2 lg:order-1">
            <MessageMockup />
          </div>
          <div className="order-1 lg:order-2">
            <p className="lp-eyebrow mb-2" style={{ color: 'var(--accent)' }}>{t('landing.realConversations')}</p>
            <p className="font-display text-3xl font-bold tracking-tight mb-4">{t('landing.practiceHeadline')}</p>
            <p className="leading-relaxed mb-6" style={{ color: 'var(--ink-soft)' }}>{t('landing.practiceBody')}</p>
            <ul className="space-y-3">
              {practiceList.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
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
          <p className="lp-eyebrow mb-2" style={{ color: 'var(--accent)' }}>{t('landing.everythingIncluded')}</p>
          <p className="font-display text-3xl font-bold tracking-tight mb-12">{t('landing.featuresHeadline')}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {features.map((f) => (
              <div key={f.title} className="pt-5" style={{ borderTop: '1px solid var(--line)' }}>
                <f.icon size={20} strokeWidth={1.75} className="mb-3" style={{ color: 'var(--ink-soft)' }} />
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ borderTop: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="relative overflow-hidden rounded-3xl bg-dots px-8 py-16 text-center" style={{ background: '#181a1f' }}>
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
                {t('landing.ctaTitle')}
              </h2>
              <p className="text-slate-400 max-w-md mx-auto mb-8">{t('landing.ctaBody')}</p>
              {!user && (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors"
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
