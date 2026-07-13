import { PlayCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import CourseCover from '../components/CourseCover'
import { LANGUAGES, LEVELS } from '../constants'

export default function Courses() {
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

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Courses</h1>
        <p className="text-slate-500 text-sm mb-6">Self-paced video lessons by language and level.</p>

        <div className="flex gap-3 mb-8">
          <select
            value={filters.language}
            onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white"
          >
            <option value="">Any language</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={filters.level}
            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white"
          >
            <option value="">Any level</option>
            {LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading courses...</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.id}`}
                className="group block bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <CourseCover course={c} className="aspect-video">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle size={32} className="text-white drop-shadow" />
                  </div>
                </CourseCover>
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-1">{c.title}</h3>
                  <p className="text-sm text-slate-500 mb-2">{c.language}</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{c.description}</p>
                  <p className="text-xs text-slate-400 mt-3">{c.lesson_count} lessons</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
