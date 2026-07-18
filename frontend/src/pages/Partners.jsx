import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { LANGUAGES, LEVELS } from '../constants'
import { avatarUrl } from '../utils/images'

export default function Partners() {
  const { t } = useTranslation()
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ language: '', level: '' })

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.language) params.language = filters.language
    if (filters.level) params.level = filters.level
    client.get('/matching/partners/', { params })
      .then(({ data }) => setPartners(data))
      .finally(() => setLoading(false))
  }, [filters])

  const selectClass = 'rounded-xl px-3.5 py-2.5 text-sm'
  const selectStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--ink)' }}>{t('partners.title')}</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>{t('partners.subtitle')}</p>

        <div className="flex gap-3 mb-8">
          <select
            value={filters.language}
            onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            className={selectClass}
            style={selectStyle}
          >
            <option value="">{t('partners.anyLanguage')}</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={filters.level}
            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            className={selectClass}
            style={selectStyle}
          >
            <option value="">{t('partners.anyLevel')}</option>
            {LEVELS.map(([value]) => <option key={value} value={value}>{t(`levels.${value}`)}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('partners.loading')}</p>
        ) : partners.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full mb-4" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
              <Search size={20} />
            </div>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('partners.empty')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {partners.map((p) => (
              <Link
                key={p.user_id}
                to={`/partners/${p.user_id}`}
                className="lp-card block hover:opacity-90 transition-opacity"
              >
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={avatarUrl(p.user_id, 80)}
                    alt=""
                    className="lp-avatar h-11 w-11 shrink-0"
                    style={{ border: '1px solid var(--line)' }}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{p.full_name}</h3>
                    <span className={`inline-block mt-1 ${p.match_type === 'exchange' ? 'lp-tag lp-tag--accent2' : 'lp-tag'}`}>
                      {p.match_type === 'exchange' ? t('partners.exchangeMatch') : t('partners.peerPractice')}
                    </span>
                  </div>
                </div>
                <p className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>
                  {t('partners.speaksLearning', { native: p.native_language, learning: p.learning_language })}
                </p>
                <p className="text-xs capitalize" style={{ color: 'var(--ink-soft)', opacity: 0.75 }}>{t(`levels.${p.proficiency_level}`, p.proficiency_level)} · {p.timezone}</p>
                {p.bio && <p className="text-sm mt-3 line-clamp-2" style={{ color: 'var(--ink-soft)' }}>{p.bio}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
