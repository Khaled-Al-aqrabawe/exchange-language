import { BookOpen, GraduationCap, MessagesSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ModalField, modalInputClass, modalInputStyle } from './ModalShell'

// The lessons of the course at the signed-in person's level, in their learning language,
// each marked when they have already finished it.
export function useMyLessons() {
  const { user } = useAuth()
  const [lessons, setLessons] = useState([])
  const language = (user?.profile?.learning_language || '').toLowerCase()
  const level = user?.profile?.language_levels?.[user?.profile?.learning_language]

  useEffect(() => {
    client.get('/courses/materials/')
      .then(({ data }) => setLessons(
        data
          .filter((m) => m.language.toLowerCase() === language && (!level || m.level === level))
          .sort((a, b) => a.order - b.order)
          .map((m) => ({ order: m.order, title: m.title, finished: m.my_status === 'complete' })),
      ))
      .catch(() => {})
  }, [language, level])

  return lessons
}

export function lessonLabel(t, lesson) {
  const base = t('partners.lessonOption', { n: lesson.order })
  return lesson.finished ? `${base} · ✓ ${t('partners.lessonFinished', 'finished')}` : base
}

const TYPE_OPTIONS = [
  { value: 'lesson', icon: BookOpen, title: ['partners.typeLesson', 'From the lessons'], hint: ['partners.typeLessonHint', 'Work through a lesson of the course together'] },
  { value: 'conversation', icon: MessagesSquare, title: ['partners.typeConversation', 'Free conversation'], hint: ['partners.typeConversationHint', 'Just talk about anything you like'] },
]

// Chooses what a session is for: a lesson from the course (optionally a specific one) or a free conversation.
export default function SessionTypePicker({ type, lesson, onChange }) {
  const { t } = useTranslation()
  const lessons = useMyLessons()

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{t('partners.sessionType', 'Session type')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {TYPE_OPTIONS.map(({ value, icon: Icon, title, hint }) => {
          const active = type === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ session_type: value, lesson: value === 'lesson' ? lesson : '' })}
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
      {type === 'lesson' && (
        <div className="mt-3">
          <ModalField label={t('partners.lessonOptional', 'Lesson (optional)')} icon={GraduationCap}>
            <select
              value={lesson || ''}
              onChange={(e) => onChange({ session_type: 'lesson', lesson: e.target.value })}
              className={`${modalInputClass} ps-11`}
              style={modalInputStyle}
            >
              <option value="">{t('partners.anyLesson')}</option>
              {lessons.map((l) => <option key={l.order} value={l.order}>{lessonLabel(t, l)}</option>)}
            </select>
          </ModalField>
        </div>
      )}
    </div>
  )
}
