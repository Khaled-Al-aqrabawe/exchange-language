import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import logoIcon from '../assets/logo-icon.png'
import { avatarUrl } from '../utils/images'

const chipSeeds = ['auth-1', 'auth-2', 'auth-3']

// Purely decorative multilingual "hello"s drifting around the panel — not UI
// copy, so intentionally not run through i18n.
const GREETINGS = [
  { text: 'Hello', top: '12%', start: '8%', size: 'text-base', float: 'lp-float-1' },
  { text: 'مرحبا', top: '22%', start: '68%', size: 'text-2xl', float: 'lp-float-2' },
  { text: 'Bonjour', top: '46%', start: '4%', size: 'text-lg', float: 'lp-float-3' },
  { text: 'こんにちは', top: '66%', start: '62%', size: 'text-base', float: 'lp-float-1' },
  { text: 'Hola', top: '30%', start: '32%', size: 'text-xl', float: 'lp-float-2' },
  { text: 'Merhaba', top: '8%', start: '48%', size: 'text-sm', float: 'lp-float-3' },
  { text: '你好', top: '58%', start: '84%', size: 'text-2xl', float: 'lp-float-1' },
  { text: 'Hallo', top: '36%', start: '82%', size: 'text-sm', float: 'lp-float-2' },
]

export default function AuthImagePanel({ quote }) {
  const { t } = useTranslation()
  const slides = [
    { kind: 'quote', text: quote },
    { kind: 'tagline', headline: t('auth.panel.slide2Headline'), body: t('auth.panel.slide2Body') },
    { kind: 'tagline', headline: t('auth.panel.slide3Headline'), body: t('auth.panel.slide3Body') },
  ]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setActive((i) => (i + 1) % slides.length), 4500)
    return () => clearInterval(interval)
  }, [slides.length])

  const slide = slides[active]

  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 bg-dots p-10">
      <div
        className="pointer-events-none absolute -top-32 -right-20 h-96 w-96 rounded-full blur-3xl lp-blob-drift"
        style={{ background: 'color-mix(in srgb, var(--accent) 35%, transparent)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full blur-3xl lp-blob-drift"
        style={{ background: 'color-mix(in srgb, var(--accent-2) 25%, transparent)', animationDelay: '3s' }}
      />
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl lp-blob-drift"
        style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', animationDelay: '6s' }}
      />

      {GREETINGS.map((g, i) => (
        <span
          key={g.text}
          className={`pointer-events-none absolute font-display font-semibold text-white/25 ${g.size} ${g.float}`}
          style={{ top: g.top, insetInlineStart: g.start, animationDelay: `${(i % 3) * 0.7}s` }}
        >
          {g.text}
        </span>
      ))}

      <div className="relative flex items-center gap-2 text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
          <img src={logoIcon} alt="" className="h-6 w-6 object-contain" />
        </span>
        <span className="font-bold tracking-tight">Language Partner</span>
      </div>

      <div className="relative">
        <div className="flex -space-x-3 mb-6">
          {chipSeeds.map((seed) => (
            <img key={seed} src={avatarUrl(seed, 64)} alt="" className="h-10 w-10 rounded-full ring-2 ring-slate-950 object-cover" />
          ))}
        </div>

        <div key={active} className="lp-animate-in-fade min-h-[6rem]">
          {slide.kind === 'quote' ? (
            <p className="text-white text-2xl font-medium leading-snug max-w-sm tracking-tight">
              {slide.text}
            </p>
          ) : (
            <>
              <p className="text-white text-xl font-bold leading-snug max-w-sm tracking-tight mb-1.5">
                {slide.headline}
              </p>
              <p className="text-white/60 text-sm leading-relaxed max-w-sm">
                {slide.body}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === active ? '20px' : '6px', background: i === active ? 'var(--accent)' : 'rgb(255 255 255 / 0.25)' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
