import { BookOpen, Layers, MessagesSquare, Radio } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ModalShell from './ModalShell'

const OPTIONS = [
  { value: 'lesson', icon: BookOpen, title: ['partners.typeLesson', 'From the lessons'], hint: ['availability.lessonHint', 'People can call you to study a lesson together'] },
  { value: 'conversation', icon: MessagesSquare, title: ['partners.typeConversation', 'Free conversation'], hint: ['availability.conversationHint', 'People can call you just to talk'] },
  { value: 'both', icon: Layers, title: ['availability.both', 'Both'], hint: ['availability.bothHint', 'Lessons and free conversation are both fine'] },
]

// Asked once per login while "Available now" is on: what are you up for right now?
// Callers only see the kinds of session you choose here.
export default function AvailabilityTypeModal({ current = 'both', onSave, onLater, onClose }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(current)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try { await onSave(value) } finally { setBusy(false) }
  }

  return (
    <ModalShell
      icon={Radio}
      title={t('availability.title', 'What do you want to do now?')}
      subtitle={t('availability.subtitle', 'You are available now. Choose what people can call you for.')}
      onClose={onClose}
      footer={(
        <div className="flex items-center gap-3">
          <button type="button" onClick={onLater || onClose} className="lp-btn-secondary shrink-0">{t('availability.later', 'Not now')}</button>
          <button type="button" onClick={save} disabled={busy} className="lp-btn-primary flex-1 disabled:opacity-50">{t('availability.confirm', 'Save')}</button>
        </div>
      )}
    >
      <div className="grid gap-3">
        {OPTIONS.map(({ value: v, icon: Icon, title, hint }) => {
          const active = value === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => setValue(v)}
              className="flex items-center gap-3 rounded-2xl p-3.5 text-start transition-all"
              style={active
                ? { background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', border: '2px solid var(--accent)' }
                : { background: 'var(--surface)', border: '2px solid var(--line)' }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={active ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)' } : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold" style={{ color: 'var(--ink)' }}>{t(...title)}</span>
                <span className="block text-xs leading-snug" style={{ color: 'var(--ink-soft)' }}>{t(...hint)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </ModalShell>
  )
}
