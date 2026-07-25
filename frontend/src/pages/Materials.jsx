import { Download, FileText, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { LANGUAGES, LEVELS } from '../constants'

export default function Materials() {
  const { t } = useTranslation()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ language: '', level: '' })

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.language) params.language = filters.language
    if (filters.level) params.level = filters.level
    client.get('/courses/materials/', { params })
      .then(({ data }) => setMaterials(data))
      .finally(() => setLoading(false))
  }, [filters])

  const selectStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-6 lp-animate-in">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--ink)' }}>{t('materials.title')}</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>{t('materials.subtitle')}</p>

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
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('materials.loading')}</p>
        ) : materials.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('materials.empty')}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {materials.map((m, i) => (
              <div
                key={m.id}
                className={`lp-surface lp-card--hover p-5 flex flex-col lp-animate-in lp-delay-${(i % 6) + 1}`}
              >
                <span className="lp-icon-badge h-10 w-10 mb-3">
                  <FileText size={17} />
                </span>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{m.title}</h3>
                <p className="text-sm mb-2 font-medium lp-gradient-text w-fit">{m.language} · {t(`levels.${m.level}`)}</p>
                <p className="text-sm line-clamp-2 flex-1" style={{ color: 'var(--ink-soft)' }}>{m.description}</p>
                <a
                  href={m.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-btn-secondary mt-4 justify-center text-sm"
                >
                  <Download size={15} /> {t('materials.download')}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
