import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarUrl } from '../utils/images'

const THREAD = [
  { mine: false, key: 'm1' },
  { mine: true, key: 'm2' },
  { mine: false, key: 'm3' },
  { mine: true, key: 'm4' },
]

export default function MessageMockup() {
  const { t } = useTranslation()
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
    <div className="lp-surface relative p-5 max-w-sm" dir="ltr">
      <div className="flex items-center gap-2.5 pb-3 mb-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <img src={avatarUrl('mockup-partner', 60)} alt="" className="lp-avatar h-8 w-8" style={{ border: '1px solid var(--line)' }} />
        <div>
          <p className="text-sm font-medium leading-tight" style={{ color: 'var(--ink)' }}>{t('mockup.sara')}</p>
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ok)' }}>
            <span className="lp-dot" />
            {t('mockup.onlineNow')}
          </p>
        </div>
      </div>
      <div className="space-y-2.5 min-h-[168px]">
        {shown.map((m, i) => (
          <div key={i} className={`flex lp-animate-in-scale ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[220px] px-3.5 py-2 text-sm"
              style={
                m.mine
                  ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: '10px 10px 2px 10px' }
                  : { background: 'var(--surface-2)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '10px 10px 10px 2px' }
              }
            >
              {t(`mockup.${m.key}`)}
            </div>
          </div>
        ))}
        {typing && visible < THREAD.length && (
          <div className={`flex ${THREAD[visible]?.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className="flex items-center gap-1 px-3.5 py-2.5"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: THREAD[visible]?.mine ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
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
