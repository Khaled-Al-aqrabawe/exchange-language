import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  MessageCircle,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import CallPreview from '../components/CallPreview'
import MessageMockup from '../components/MessageMockup'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

const steps = [
  {
    n: '01',
    title: 'Exchange with native speakers',
    body: 'Learn English from English speakers while teaching them Arabic — or any language pair you like.',
  },
  {
    n: '02',
    title: 'Practice with peers',
    body: 'No exchange partner online? Practice conversation with someone else learning the same language.',
  },
  {
    n: '03',
    title: 'Learn independently',
    body: 'Work through structured video courses by language and level, at your own pace.',
  },
]

const features = [
  { icon: Video, title: 'Built-in video & audio', body: 'Face-to-face conversation practice in your browser — no downloads, no extra apps.' },
  { icon: Users, title: 'Smart matching', body: 'We rank exchange partners first, then fall back to peers at your level and timezone.' },
  { icon: MessageCircle, title: 'Real-time messaging', body: 'Chat with partners instantly to plan sessions or keep the conversation going.' },
  { icon: CalendarClock, title: 'Simple scheduling', body: 'Book sessions in a couple of clicks and jump straight into a call when it\'s time.' },
  { icon: BookOpenCheck, title: 'Structured courses', body: 'Self-paced video lessons by language and level whenever you want extra structure.' },
  { icon: ShieldCheck, title: 'Free to start', body: 'Every feature is unlocked during early access — no credit card, no paywalls.' },
]

const learnerSeeds = ['learner-1', 'learner-2', 'learner-3', 'learner-4', 'learner-5']

export default function Landing() {
  const { user } = useAuth()

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-indigo-100 blur-3xl opacity-50" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 sm:pt-20 pb-24 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" /> Free during early access
            </span>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.05]">
              Learn a language by
              <br />
              <span className="text-gradient">actually speaking it</span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
              Language Partner connects you with native speakers and fellow learners for
              real conversation practice, plus structured video courses to build your
              foundation.
            </p>

            <div className="mt-9 flex items-center gap-3 flex-wrap">
              {user ? (
                <Link
                  to="/partners"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
                >
                  Find a partner <ArrowRight size={17} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Get started free <ArrowRight size={17} />
                  </Link>
                  <Link
                    to="/about"
                    className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Learn more
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-3">
                {learnerSeeds.map((seed) => (
                  <img key={seed} src={avatarUrl(seed, 64)} alt="" className="h-9 w-9 rounded-full ring-2 ring-white object-cover" />
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Join learners practicing <span className="font-medium text-slate-700">Arabic, English</span> and more
              </p>
            </div>
          </div>

          <CallPreview />
        </div>
      </section>

      {/* How it works — editorial numbered list, no icon boxes */}
      <section className="border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-10">How it works</p>
          <div className="divide-y divide-slate-200">
            {steps.map((step) => (
              <div key={step.n} className="grid sm:grid-cols-[80px_1fr] gap-4 sm:gap-8 py-8 first:pt-0 last:pb-0">
                <span className="text-4xl font-bold text-slate-200 tabular-nums">{step.n}</span>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg mb-1.5">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed max-w-md">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase — real UI mockup, not stock photography */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex justify-center order-2 lg:order-1">
            <MessageMockup />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-2">Real conversations</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
              Practice with people, not flashcards
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Apps that only drill vocabulary can only take you so far. Language Partner
              gets you talking with a real person from your very first session — messaging
              to plan, video to practice, and courses to fill in the gaps.
            </p>
            <ul className="space-y-3">
              {['Matched by language pair, level, and timezone', 'Built-in chat and video — nothing to install', 'Free structured courses when you want more structure'].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <ShieldCheck size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features — flat list, no colored boxes */}
      <section className="border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-2">Everything included</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight mb-12">Built for real conversation practice</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {features.map((f) => (
              <div key={f.title} className="border-t border-slate-200 pt-5">
                <f.icon size={20} strokeWidth={1.75} className="text-slate-400 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 bg-dots px-8 py-16 text-center">
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
                Free to use, no catch
              </h2>
              <p className="text-slate-400 max-w-md mx-auto mb-8">
                Language Partner is free during our early access phase — every feature is
                unlocked from day one.
              </p>
              {!user && (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors"
                >
                  Create your free account <ArrowRight size={17} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
