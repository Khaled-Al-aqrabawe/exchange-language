import { ArrowLeft, Download, ExternalLink, FileText, FolderOpen, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { LANGUAGES, MATERIAL_LEVELS } from '../constants'
import { downloadFile } from '../utils/downloadFile'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
const OFFICE_EXTENSIONS = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx']

function MaterialViewer({ material, onClose, t }) {
  const name = material.file_name || material.title
  const ext = name.split('.').pop()?.toLowerCase()
  const isImage = IMAGE_EXTENSIONS.includes(ext)
  const isOffice = OFFICE_EXTENSIONS.includes(ext)
  // Office Online can only fetch publicly reachable URLs, so it won't work on localhost
  const isLocal = ['localhost', '127.0.0.1'].includes(new URL(material.file, window.location.href).hostname)
  const src = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(material.file)}`
    : `${material.file}${material.file.includes('?') ? '&' : '?'}embed=1`
  const canView = isImage || !isOffice || !isLocal

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 lp-animate-in-scale">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.1)' }}>
        <span className="inline-flex items-center gap-2 min-w-0 text-sm text-white">
          <FileText size={15} className="shrink-0 text-slate-400" />
          <span className="truncate">{material.title}</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => downloadFile(material.file, material.file_name)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            title={t('materials.download')}
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        {!canView ? (
          <div className="flex flex-col items-center justify-center gap-3 h-full text-slate-400">
            <FileText size={32} />
            <p className="text-sm">{name}</p>
            <button type="button" onClick={() => downloadFile(material.file, material.file_name)} className="lp-btn-secondary text-sm">
              <Download size={15} /> {t('materials.download')}
            </button>
          </div>
        ) : isImage ? (
          <img src={material.file} alt={material.title} className="w-full h-full object-contain bg-black" />
        ) : (
          <iframe src={src} title={material.title} className="w-full h-full bg-white border-0" />
        )}
      </div>
    </div>
  )
}

export default function Materials() {
  const { t } = useTranslation()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ language: '' })
  const [openLevel, setOpenLevel] = useState(null)
  const [openLang, setOpenLang] = useState(null)
  const [viewing, setViewing] = useState(null)

  const language = filters.language || openLang
  const scoped = materials.filter((m) => !language || m.language === language)
  const languagesPresent = LANGUAGES.filter((l) => materials.some((m) => m.language === l))

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.language) params.language = filters.language
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
              onChange={(e) => { setFilters({ ...filters, language: e.target.value }); setOpenLevel(null); setOpenLang(null) }}
              className="rounded-xl px-3.5 py-2.5 text-sm"
              style={selectStyle}
            >
              <option value="">{t('courses.anyLanguage')}</option>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-10">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('materials.loading')}</p>
        ) : materials.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('materials.empty')}</p>
        ) : !openLevel ? (
          <div className="grid gap-5">
            {languagesPresent.filter((l) => !filters.language || l === filters.language).map((lang, i) => (
              <div key={lang} className={`lp-surface p-6 lp-animate-in lp-delay-${(i % 6) + 1}`}>
                <div className="flex items-center gap-4 mb-5">
                  <span className="lp-icon-badge h-12 w-12"><FolderOpen size={20} /></span>
                  <div>
                    <h2 className="text-xl font-bold lp-gradient-text w-fit">{lang}</h2>
                    <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                      {t('materials.filesCount', { count: materials.filter((m) => m.language === lang).length })}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {MATERIAL_LEVELS.map((lvl) => {
                    const count = materials.filter((m) => m.language === lang && m.level === lvl).length
                    return (
                      <button
                        key={lvl}
                        type="button"
                        disabled={count === 0}
                        onClick={() => { setOpenLang(lang); setOpenLevel(lvl) }}
                        className="rounded-xl px-3 py-3 text-center transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}
                      >
                        <span className="block text-lg font-bold lp-gradient-text mx-auto w-fit">{lvl}</span>
                        <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>{t('materials.filesCount', { count })}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
          <button
            type="button"
            onClick={() => { setOpenLevel(null); setOpenLang(null) }}
            className="inline-flex items-center gap-1.5 text-sm font-medium mb-4"
            style={{ color: 'var(--ink-soft)' }}
          >
            <ArrowLeft size={15} /> <span className="lp-gradient-text">{language} · {openLevel}</span>
          </button>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {scoped.filter((m) => m.level === openLevel).map((m, i) => (
              <div
                key={m.id}
                className={`lp-surface lp-card--hover p-5 flex flex-col lp-animate-in lp-delay-${(i % 6) + 1}`}
              >
                <span className="lp-icon-badge h-10 w-10 mb-3">
                  <FileText size={17} />
                </span>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{m.title}</h3>
                <p className="text-sm mb-2 font-medium lp-gradient-text w-fit">{m.language} · {m.level}</p>
                <p className="text-sm line-clamp-2 flex-1" style={{ color: 'var(--ink-soft)' }}>{m.description}</p>
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setViewing(m)}
                    className="lp-btn-secondary flex-1 justify-center text-sm"
                  >
                    <ExternalLink size={15} /> {t('materials.openFile')}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadFile(m.file, m.file_name)}
                    className="lp-btn-secondary flex-1 justify-center text-sm"
                  >
                    <Download size={15} /> {t('materials.download')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
      {viewing && <MaterialViewer material={viewing} onClose={() => setViewing(null)} t={t} />}
    </div>
  )
}
