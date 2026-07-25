import { PlayCircle, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import CourseCover from '../components/CourseCover'
import { LANGUAGES, LEVELS } from '../constants'

export default function Courses() {
  const { t } = useTranslation()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ language: '', level: '' })

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.language) params.language = filters.language
    if (filters.level) params.level = filters.level
    client.get('/courses/', { params })
      .then(({ data }) => setCourses(data))
      .finally(() => setLoading(false))
  }, [filters])

  const selectStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-6 lp-animate-in">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--ink)' }}>{t('courses.title')}</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>{t('courses.subtitle')}</p>

          <div className="flex flex-wrap items-center gap-3">
            <SlidersHorizontal size={15} style={{ color: 'var(--ink-soft)' }} />
            <select
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
              className="rounded-xl px-3.5 py-2.5 text-sm"
              style={selectStyle}
            >
              <option value="">{t('courses.anyLanguage')}</option>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="rounded-xl px-3.5 py-2.5 text-sm"
              style={selectStyle}
            >
              <option value="">{t('courses.anyLevel')}</option>
              {LEVELS.map(([value]) => <option key={value} value={value}>{t(`levels.${value}`)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-10">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('courses.loading')}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c, i) => (
              <Link
                key={c.id}
                to={`/courses/${c.id}`}
                className={`group lp-surface lp-card--hover block overflow-hidden lp-animate-in lp-delay-${(i % 6) + 1}`}
              >
                <CourseCover course={c} className="aspect-video">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgb(0 0 0 / 0.15)' }}>
                    <PlayCircle size={36} className="text-white drop-shadow-lg transition-transform group-hover:scale-110" />
                  </div>
                </CourseCover>
                <div className="p-5">
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{c.title}</h3>
                  <p className="text-sm mb-2 font-medium lp-gradient-text w-fit">{c.language}</p>
                  <p className="text-sm line-clamp-2" style={{ color: 'var(--ink-soft)' }}>{c.description}</p>
                  <p className="text-xs mt-3" style={{ color: 'var(--ink-soft)', opacity: 0.75 }}>{t('courses.lessonsCount', { count: c.lesson_count })}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
