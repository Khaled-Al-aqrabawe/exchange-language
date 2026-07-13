import { CheckCircle2, CirclePlay } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import client from '../api/client'
import { pickGradient } from '../utils/gradients'

export default function CoursePlayer() {
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

  if (loading) return <div className="p-16 text-center text-slate-500 text-sm">Loading...</div>
  if (!course) return <div className="p-16 text-center text-slate-500 text-sm">Course not found.</div>

  const activeLesson = course.lessons.find((l) => l.id === activeLessonId) || course.lessons[0]
  const completedCount = course.lessons.filter((l) => l.completed).length
  const progressPct = course.lessons.length ? Math.round((completedCount / course.lessons.length) * 100) : 0

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${pickGradient(course.id)} bg-dots`}>
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-5xl mx-auto px-6 pb-5 w-full">
            <h1 className="text-2xl font-bold text-white tracking-tight">{course.title}</h1>
            <p className="text-slate-200 text-sm">{course.language} · <span className="capitalize">{course.level}</span></p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {completedCount} / {course.lessons.length} lessons
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeLesson ? (
              <>
                <video
                  key={activeLesson.id}
                  src={activeLesson.video_url}
                  controls
                  className="w-full rounded-2xl bg-black shadow-sm"
                  style={{ aspectRatio: '16 / 9' }}
                />
                <div className="flex items-center justify-between mt-4">
                  <h2 className="font-semibold text-slate-900">{activeLesson.title}</h2>
                  <button
                    onClick={() => toggleComplete(activeLesson)}
                    className={`inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-medium transition-colors ${
                      activeLesson.completed
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    {activeLesson.completed ? 'Completed' : 'Mark as complete'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-sm">This course has no lessons yet.</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden self-start shadow-sm">
            {course.lessons.map((lesson, i) => (
              <button
                key={lesson.id}
                onClick={() => setActiveLessonId(lesson.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-slate-100 last:border-0 flex items-center gap-3 ${
                  lesson.id === activeLessonId ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    lesson.completed
                      ? 'bg-green-100 text-green-700'
                      : lesson.id === activeLessonId
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {lesson.completed ? <CheckCircle2 size={13} /> : i + 1}
                </span>
                <span className="text-sm text-slate-800 flex-1">{lesson.title}</span>
                {lesson.id === activeLessonId && <CirclePlay size={15} className="text-indigo-600" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
