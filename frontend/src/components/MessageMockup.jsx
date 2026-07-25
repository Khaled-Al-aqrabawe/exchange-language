import { useEffect, useState } from 'react'
import { avatarUrl } from '../utils/images'

const THREAD = [
  { mine: false, text: "Hey! Saw you're learning Arabic 👋" },
  { mine: true, text: 'Yes! Would love to practice sometime this week' },
  { mine: false, text: "Let's do Thursday evening?" },
  { mine: true, text: 'Perfect, see you then! 🎉' },
]

export default function MessageMockup() {
  const [visible, setVisible] = useState(2)
  const [typing, setTyping] = useState(true)

  useEffect(() => {
    if (visible >= THREAD.length) {
      const reset = setTimeout(() => {
        setVisible(2)
        setTyping(true)
      }, 2600)
      return () => clearTimeout(reset)
    }
    setTyping(true)
    const revealNext = setTimeout(() => {
      setTyping(false)
      setVisible((v) => v + 1)
    }, 1400)
    return () => clearTimeout(revealNext)
  }, [visible])

  const shown = THREAD.slice(0, visible)

  return (
    <div
      className="relative rounded-2xl shadow-xl p-5 max-w-sm"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      dir="ltr"
    >
      <span
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] blur-2xl lp-blob-drift"
        style={{ background: 'var(--gradient-brand)', opacity: 0.16 }}
      />
      <div className="flex items-center gap-2.5 pb-3 mb-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <img src={avatarUrl('mockup-partner', 60)} alt="" className="h-8 w-8 rounded-full object-cover" />
        <div>
          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--ink)' }}>Sara</p>
          <p className="text-xs" style={{ color: 'var(--accent-2)' }}>Online now</p>
        </div>
      </div>
      <div className="space-y-2.5 min-h-[168px]">
        {shown.map((m, i) => (
          <div key={i} className={`flex lp-animate-in-scale ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[220px] px-3.5 py-2 text-sm"
              style={
                m.mine
                  ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)', borderRadius: '16px 16px 4px 16px' }
                  : { background: 'var(--surface-2)', color: 'var(--ink)', borderRadius: '16px 16px 16px 4px' }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && visible < THREAD.length && (
          <div className={`flex ${THREAD[visible]?.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className="flex items-center gap-1 px-3.5 py-2.5"
              style={{
                background: 'var(--surface-2)',
                borderRadius: THREAD[visible]?.mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ background: 'var(--ink-soft)' }} />
              <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ background: 'var(--ink-soft)' }} />
              <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: 'var(--ink-soft)' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
