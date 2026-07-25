import { CheckCircle2, CirclePlay } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import client from '../api/client'
import { pickGradient } from '../utils/gradients'

export default function CoursePlayer() {
  const { t } = useTranslation()
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [activeLessonId, setActiveLessonId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () =>
    client.get(`/courses/${courseId}/`).then(({ data }) => {
      setCourse(data)
      setActiveLessonId((current) => current ?? data.lessons[0]?.id)
    })

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [courseId])

  const toggleComplete = async (lesson) => {
    await client.post(`/courses/lessons/${lesson.id}/complete/`, { completed: !lesson.completed })
    load()
  }

  if (loading) return <div className="p-16 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('coursePlayer.loading')}</div>
  if (!course) return <div className="p-16 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('coursePlayer.notFound')}</div>

  const activeLesson = course.lessons.find((l) => l.id === activeLessonId) || course.lessons[0]
  const completedCount = course.lessons.filter((l) => l.completed).length
  const progressPct = course.lessons.length ? Math.round((completedCount / course.lessons.length) * 100) : 0

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className={`relative h-40 overflow-hidden bg-linear-to-br ${pickGradient(course.id)} bg-dots`}>
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-5xl mx-auto px-6 pb-5 w-full">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">{course.title}</h1>
            <p className="text-slate-200 text-sm">{course.language} · <span className="capitalize">{t(`levels.${course.level}`, course.level)}</span></p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6 lp-animate-in">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--gradient-brand)' }} />
          </div>
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>
            {t('coursePlayer.lessonsProgress', { completed: completedCount, total: course.lessons.length })}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 lp-animate-in">
            {activeLesson ? (
              <>
                <video
                  key={activeLesson.id}
                  src={activeLesson.video_url}
                  controls
                  className="w-full rounded-2xl bg-black"
                  style={{ aspectRatio: '16 / 9', boxShadow: 'var(--shadow-card-hover)' }}
                />
                <div className="flex items-center justify-between mt-4">
                  <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>{activeLesson.title}</h2>
                  <button
                    onClick={() => toggleComplete(activeLesson)}
                    className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={
                      activeLesson.completed
                        ? { background: 'var(--surface-2)', color: 'var(--accent-2)' }
                        : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }
                    }
                  >
                    <CheckCircle2 size={15} />
                    {activeLesson.completed ? t('coursePlayer.completed') : t('coursePlayer.markComplete')}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('coursePlayer.noLessons')}</p>
            )}
          </div>

          <div className="lp-surface overflow-hidden self-start lp-animate-in lp-delay-1" style={{ boxShadow: 'var(--shadow-card)' }}>
            {course.lessons.map((lesson, i) => (
              <button
                key={lesson.id}
                onClick={() => setActiveLessonId(lesson.id)}
                className="w-full text-start px-4 py-3.5 flex items-center gap-3 hover:opacity-80 transition-opacity"
                style={{
                  borderBottom: '1px solid var(--line)',
                  background: lesson.id === activeLessonId ? 'var(--surface-2)' : 'transparent',
                }}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={
                    lesson.completed
                      ? { background: 'var(--surface-2)', color: 'var(--accent-2)' }
                      : lesson.id === activeLessonId
                        ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)' }
                        : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }
                  }
                >
                  {lesson.completed ? <CheckCircle2 size={13} /> : i + 1}
                </span>
                <span className="text-sm flex-1" style={{ color: 'var(--ink)' }}>{lesson.title}</span>
                {lesson.id === activeLessonId && <CirclePlay size={15} style={{ color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
