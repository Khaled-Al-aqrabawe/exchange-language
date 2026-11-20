import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrandMark } from './BrandLogo'

const css = `
@keyframes ls-coral { from { clip-path: polygon(-40% 0, -40% 0, -70% 100%, -70% 100%) } to { clip-path: polygon(-40% 0, 150% 0, 120% 100%, -70% 100%) } }
@keyframes ls-violet { from { clip-path: polygon(-40% 0, -40% 0, -70% 100%, -70% 100%) } to { clip-path: polygon(-40% 0, 150% 0, 120% 100%, -70% 100%) } }
@keyframes ls-pop { from { opacity: 0; transform: translateY(14px) scale(.97) } to { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) { .ls-anim { animation-duration: 0.01s !important; animation-delay: 0s !important } }
`

/**
 * Post-login transition: a coral slash then a violet slash sweep diagonally
 * across the screen, then a welcome message appears. Calls onDone when finished.
 */
export default function LoginSplash({ name, onDone, duration = 1900 }) {
  const { t } = useTranslation()

  useEffect(() => {
    const id = setTimeout(onDone, duration)
    return () => clearTimeout(id)
  }, [onDone, duration])

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" role="status" aria-live="polite">
      <style>{css}</style>
      <div className="ls-anim absolute inset-0" style={{ background: '#F43F5E', animation: 'ls-coral 0.55s cubic-bezier(.7,0,.2,1) both' }} />
      <div className="ls-anim absolute inset-0" style={{ background: '#7C3AED', animation: 'ls-violet 0.6s cubic-bezier(.7,0,.2,1) 0.18s both' }} />
      <div
        className="ls-anim absolute inset-0 flex flex-col items-center justify-center gap-5 text-center"
        style={{ color: '#fff', animation: 'ls-pop 0.5s ease 0.75s both' }}
      >
        <BrandMark className="h-20" />
        <p className="lp-serif px-6 text-[2rem] sm:text-[2.75rem]">
          {name ? t('dashboard.welcomeWithName', { name }) : t('dashboard.welcome')}
        </p>
      </div>
    </div>
  )
}
