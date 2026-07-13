import { Globe2, HeartHandshake, Target } from 'lucide-react'
import MessageMockup from '../components/MessageMockup'

const values = [
  {
    icon: HeartHandshake,
    title: 'Real people, real practice',
    body: 'The fastest way to learn a language is to speak it with another human being — not tap through flashcards alone.',
  },
  {
    icon: Globe2,
    title: 'Accessible to everyone',
    body: 'Authentic conversation practice shouldn\'t require finding or affording a private tutor.',
  },
  {
    icon: Target,
    title: 'Structure when you need it',
    body: 'Courses fill the gaps between conversations so you always have something to work on.',
  },
]

export default function About() {
  return (
    <div>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-4">About us</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Fluency comes from <span className="text-gradient">conversation</span>
        </h1>
        <p className="mt-5 text-lg text-slate-600 leading-relaxed">
          Language Partner exists because the fastest way to learn a language is to
          actually speak it with another person. We connect learners for native-speaker
          exchange, peer practice, and structured self-paced courses — all in one place.
        </p>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex justify-center">
            <MessageMockup />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-2">Our mission</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
              Make authentic practice accessible to anyone, anywhere
            </p>
            <p className="text-slate-600 leading-relaxed">
              We match learners by language pair, level, and timezone, then get out of the
              way — built-in video and chat so there's nothing extra to install, and courses
              for whenever you want a bit more structure between sessions.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-2">What we believe</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight mb-12">Our approach</p>
          <div className="grid sm:grid-cols-3 gap-x-8 gap-y-10">
            {values.map((v) => (
              <div key={v.title} className="border-t border-slate-200 pt-5">
                <v.icon size={20} strokeWidth={1.75} className="text-slate-400 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1.5">{v.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
