import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrandMark } from './BrandLogo'
import { avatarUrl } from '../utils/images'

const chipSeeds = ['auth-1', 'auth-2', 'auth-3']

// A quiet row of multilingual "hello"s closing the panel — not UI copy, so
// intentionally not run through i18n.
const GREETINGS = [
  { text: 'Hello' },
  { text: 'مرحبا' },
  { text: 'Bonjour' },
  { text: 'こんにちは' },
  { text: 'Hola' },
  { text: 'Merhaba' },
  { text: '你好' },
  { text: 'Hallo' },
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
    <div
      className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12"
      style={{
        // a soft mid-tone: periwinkle fading to mint, dark text on top
        background: 'linear-gradient(155deg, #c3d0f2 0%, #b9d6ea 55%, #aee2d3 100%)',
        '--ink': '#0b1a2c', '--ink-soft': 'rgb(11 26 44 / 0.75)', '--ink-faint': 'rgb(11 26 44 / 0.55)',
        '--line': 'rgb(11 26 44 / 0.16)', '--line-strong': 'rgb(11 26 44 / 0.28)', '--surface-2': '#c3d0f2',
      }}
    >
      <span className="pointer-events-none absolute -bottom-24 -end-24 h-72 w-72 rounded-full" style={{ background: '#fff', opacity: 0.25 }} />
      <span className="pointer-events-none absolute -top-16 -start-16 h-48 w-48 rounded-full" style={{ background: '#fff', opacity: 0.18 }} />
      <div className="relative flex items-center gap-2.5">
        <BrandMark className="h-8 w-8" />
        <span className="font-display text-lg font-semibold tracking-tight" style={{ color: '#0b1a2c' }}>
          Lan<span style={{ color: '#1b4d7a' }}>Bro</span>
        </span>
      </div>

      <div className="relative">
        <div className="flex -space-x-2 rtl:space-x-reverse mb-7">
          {chipSeeds.map((seed) => (
            <img
              key={seed}
              src={avatarUrl(seed, 64)}
              alt=""
              className="lp-avatar h-9 w-9"
              style={{ border: '1px solid var(--line-strong)', outline: '2px solid var(--surface-2)' }}
            />
          ))}
        </div>

        <div key={active} className="lp-animate-in-fade min-h-[7rem]">
          {slide.kind === 'quote' ? (
            <p className="lp-serif text-[1.9rem] leading-snug max-w-md" style={{ color: '#0b1a2c' }}>
              {slide.text}
            </p>
          ) : (
            <>
              <p className="lp-serif text-[1.9rem] leading-snug max-w-md mb-2.5" style={{ color: '#0b1a2c' }}>
                {slide.headline}
              </p>
              <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--ink-soft)' }}>
                {slide.body}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-7">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className="h-1 rounded-full transition-all duration-300"
              style={{ width: i === active ? '24px' : '10px', background: i === active ? '#1b4d7a' : 'rgb(11 26 44 / 0.25)' }}
            />
          ))}
        </div>

        <div
          className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-6"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {GREETINGS.map((g) => (
            <span key={g.text} className="font-display text-sm" style={{ color: 'var(--ink-faint)' }}>
              {g.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
