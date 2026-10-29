import { ArrowLeft, CheckCircle2, Download, ExternalLink, FileText, FolderOpen, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import PptxSlideViewer from '../components/PptxSlideViewer'
import { useAuth } from '../context/AuthContext'
import { LANGUAGES, MATERIAL_LEVELS } from '../constants'
import { downloadBlob, downloadFile } from '../utils/downloadFile'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
const OFFICE_EXTENSIONS = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx']

// Office Online can't reach localhost, so .pptx files are drawn in the browser as real slides.
function PptxSlides({ material, t, fallback }) {
  const [status, setStatus] = useState('loading')
  const [index, setIndex] = useState(0)
  const [total, setTotal] = useState(0)

  if (status === 'error') return fallback
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
      {status === 'loading' && <p className="text-sm text-slate-500">{t('materials.loading')}</p>}
      <div
        className="w-full overflow-hidden rounded-lg shadow-lg"
        style={{ maxWidth: 'min(100%, calc((100vh - 15rem) * 16 / 9))', aspectRatio: '16 / 9', border: '1px solid var(--line)', display: status === 'ready' ? 'block' : 'none' }}
      >
        <PptxSlideViewer url={material.file} index={index} onReady={(count) => { setTotal(count); setStatus('ready') }} onError={() => setStatus('error')} />
      </div>
      {status === 'ready' && (
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="rounded-full px-3 py-1 hover:bg-slate-200 disabled:opacity-30" aria-label="Previous slide">‹</button>
          <span>{index + 1} / {total}</span>
          <button type="button" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} disabled={index >= total - 1} className="rounded-full px-3 py-1 hover:bg-slate-200 disabled:opacity-30" aria-label="Next slide">›</button>
        </div>
      )}
    </div>
  )
}

function SlideTextPreview({ material, name, t }) {
  const [slides, setSlides] = useState(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setSlides(null)
    setIndex(0)
    if (!material.id) { setSlides([]); return }
    client.get(`/courses/materials/${material.id}/text/`)
      .then(({ data }) => setSlides(data.slides || []))
      .catch(() => setSlides([]))
  }, [material.id])

  if (slides === null) return <p className="flex h-full items-center justify-center text-sm text-slate-500">{t('materials.loading')}</p>
  if (slides.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
        <FileText size={32} />
        <p className="text-sm">{name}</p>
        <button type="button" onClick={() => downloadFile(material.file, material.file_name)} className="lp-btn-secondary text-sm">
          <Download size={15} /> {t('materials.download')}
        </button>
      </div>
    )
  }
  const lines = slides[index] || []
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-center gap-4 border-b border-slate-200 px-4 py-2 text-sm text-slate-600">
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="rounded-full px-3 py-1 hover:bg-slate-200 disabled:opacity-30">‹</button>
        <span>{index + 1} / {slides.length}</span>
        <button type="button" onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))} disabled={index === slides.length - 1} className="rounded-full px-3 py-1 hover:bg-slate-200 disabled:opacity-30">›</button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-3 rounded-2xl bg-white shadow p-8">
          {lines.map((line, i) => (
            <p key={i} dir="auto" className={`leading-relaxed text-slate-900 ${i === 0 ? 'text-2xl font-bold' : 'text-base'}`}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 lp-animate-in-scale">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--line)', background: '#fff' }}>
        <span className="inline-flex items-center gap-2 min-w-0 text-sm font-semibold text-slate-800">
          <FileText size={15} className="shrink-0 text-slate-400" />
          <span className="truncate">{material.title}</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => downloadFile(material.file, material.file_name)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            title={t('materials.download')}
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        {!canView ? (
          ext === 'pptx'
            ? <PptxSlides material={material} name={name} t={t} fallback={<SlideTextPreview material={material} name={name} t={t} />} />
            : <SlideTextPreview material={material} name={name} t={t} />
        ) : isImage ? (
          <img src={material.file} alt={material.title} className="w-full h-full object-contain bg-slate-100" />
        ) : (
          <iframe src={src} title={material.title} className="w-full h-full bg-white border-0" />
        )}
      </div>
    </div>
  )
}

function UploadPanel({ t, onUploaded }) {
  const [form, setForm] = useState({ language: LANGUAGES[0], level: MATERIAL_LEVELS[0] })
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const inputRef = useRef(null)
  const fieldStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

  const submit = async (e) => {
    e.preventDefault()
    if (files.length === 0) return
    setBusy(true)
    setMessage(null)
    const body = new FormData()
    body.append('language', form.language)
    body.append('level', form.level)
    files.forEach((f) => body.append('files', f))
    try {
      const { data } = await client.post('/courses/materials/', body, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMessage({ ok: true, text: t('materials.uploaded', { count: data.length }) })
      setFiles([])
      if (inputRef.current) inputRef.current.value = ''
      onUploaded()
    } catch (err) {
      const d = err.response?.data
      setMessage({ ok: false, text: d && typeof d === 'object' ? Object.values(d).flat().join(' ') : t('materials.uploadError') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="lp-surface p-5 mt-6 flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('materials.language')}</label>
        <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="rounded-xl px-3.5 py-2.5 text-sm" style={fieldStyle}>
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('materials.level')}</label>
        <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="rounded-xl px-3.5 py-2.5 text-sm" style={fieldStyle}>
          {MATERIAL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className="min-w-0">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-soft)' }}>{t('materials.files')}</label>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => setFiles([...e.target.files])}
          className="block w-64 max-w-full cursor-pointer rounded-xl px-2 py-1.5 text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--accent)] file:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] hover:file:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)]"
          style={{ ...fieldStyle, color: 'var(--ink-soft)' }}
        />
      </div>
      <button type="submit" disabled={busy || files.length === 0} className="lp-btn-primary disabled:opacity-50">
        <Upload size={15} /> {busy ? t('materials.uploading') : t('materials.upload')}
      </button>
      {message && (
        <p className="w-full text-sm" style={{ color: message.ok ? 'var(--accent-2)' : '#c1443d' }}>{message.text}</p>
      )}
    </form>
  )
}

export default function Materials() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ language: '', level: '' })
  const [openLevel, setOpenLevel] = useState(null)
  const [openLang, setOpenLang] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [zipBusy, setZipBusy] = useState(false)

  // How many lessons of a language/level the user has completed.
  const levelProgress = (lang, lvl) => {
    const lessons = materials.filter((m) => m.language === lang && m.level === lvl)
    const done = lessons.filter((m) => m.my_status === 'complete').length
    return { total: lessons.length, done, finished: lessons.length > 0 && done === lessons.length }
  }

  const downloadLevel = async (lang, lvl) => {
    setZipBusy(true)
    try {
      const { data } = await client.get('/courses/materials/download/', { params: { language: lang, level: lvl }, responseType: 'blob' })
      downloadBlob(`${lang}-${lvl}.zip`, data)
    } finally {
      setZipBusy(false)
    }
  }

  const language = filters.language || openLang
  const scoped = materials.filter((m) => !language || m.language === language)
  const languagesPresent = LANGUAGES.filter((l) => materials.some((m) => m.language === l && (!filters.level || m.level === filters.level)))
  const levelsPresent = MATERIAL_LEVELS.filter((lvl) => materials.some((m) => m.level === lvl && (!filters.language || m.language === filters.language)))

  const load = () => {
    setLoading(true)
    // Always load everything: the filters narrow it down here and list only what exists.
    client.get('/courses/materials/')
      .then(({ data }) => setMaterials(data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDelete = async (m) => {
    if (!window.confirm(t('materials.confirmDelete', { title: m.title }))) return
    await client.delete(`/courses/materials/${m.id}/`)
    load()
  }

  const selectStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-6 lp-animate-in">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl mb-1" style={{ color: 'var(--ink)' }}>{t('materials.title')}</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>{t('materials.subtitle')}</p>

          <div className="flex flex-wrap items-center gap-3">
            <SlidersHorizontal size={15} style={{ color: 'var(--ink-soft)' }} />
            <select
              value={filters.language}
              onChange={(e) => {
                const lang = e.target.value
                const stillThere = !filters.level || materials.some((m) => m.level === filters.level && (!lang || m.language === lang))
                setFilters({ language: lang, level: stillThere ? filters.level : '' }); setOpenLevel(null); setOpenLang(null) }}
              className="rounded-xl px-3.5 py-2.5 text-sm"
              style={selectStyle}
            >
              <option value="">{t('courses.anyLanguage')}</option>
              {languagesPresent.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={filters.level}
              onChange={(e) => { setFilters({ ...filters, level: e.target.value }); setOpenLevel(null); setOpenLang(null) }}
              className="rounded-xl px-3.5 py-2.5 text-sm"
              style={selectStyle}
            >
              <option value="">{t('materials.anyLevel')}</option>
              {levelsPresent.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          {user?.is_superuser && <UploadPanel t={t} onUploaded={load} />}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-10">
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
                  {MATERIAL_LEVELS.filter((lvl) => !filters.level || lvl === filters.level).map((lvl) => {
                    const count = materials.filter((m) => m.language === lang && m.level === lvl).length
                    const progress = levelProgress(lang, lvl)
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
                        {count > 0 && (
                          progress.finished ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent-2)' }}>
                              <CheckCircle2 size={12} /> {t('materials.levelDone')}
                            </span>
                          ) : (
                            <span className="mt-1 block text-xs" style={{ color: 'var(--ink-soft)' }}>
                              {t('materials.progressCount', { done: progress.done, total: progress.total })}
                            </span>
                          )
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => { setOpenLevel(null); setOpenLang(null) }}
                className="inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: 'var(--ink-soft)' }}
              >
                <ArrowLeft size={15} /> <span className="lp-gradient-text">{language} · {openLevel}</span>
              </button>
              {levelProgress(language, openLevel).finished ? (
                <span className="lp-tag lp-tag--accent2 inline-flex items-center gap-1">
                  <CheckCircle2 size={12} /> {t('materials.levelDone')}
                </span>
              ) : (
                <span className="lp-tag">
                  {t('materials.progressCount', { done: levelProgress(language, openLevel).done, total: levelProgress(language, openLevel).total })}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => downloadLevel(language, openLevel)}
              disabled={zipBusy}
              className="lp-btn-primary text-sm disabled:opacity-50"
            >
              <Download size={15} /> {zipBusy ? t('materials.preparing') : t('materials.downloadLevel')}
            </button>
          </div>
          {(() => {
            const lessons = scoped.filter((x) => x.level === openLevel)
            const nextId = lessons.find((x) => x.my_status !== 'complete')?.id
            const progress = levelProgress(language, openLevel)
            return (
              <>
                <div className="lp-surface mb-6 flex flex-wrap items-center gap-4 p-5 lp-animate-in">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{language} · {openLevel}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: '#22c55e' }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>{progress.done} / {progress.total}</span>
                </div>
                <ol className="relative">
                  {lessons.map((m, i) => {
                    const done = m.my_status === 'complete'
                    const partial = m.my_status === 'partial'
                    const isNext = m.id === nextId
                    const color = done ? '#22c55e' : partial ? '#f59e0b' : 'var(--accent)'
                    return (
                      <li key={m.id} className={`relative flex gap-4 pb-5 lp-animate-in lp-delay-${(i % 6) + 1}`}>
                        {i < lessons.length - 1 && (
                          <span className="absolute start-[19px] top-10 bottom-0 w-0.5" style={{ background: done ? '#22c55e' : 'var(--line)' }} />
                        )}
                        <span
                          className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                          style={done
                            ? { background: '#22c55e', color: '#fff' }
                            : { background: 'var(--surface)', color, border: `2px solid ${isNext || partial ? color : 'var(--line)'}` }}
                        >
                          {done ? <CheckCircle2 size={20} /> : i + 1}
                        </span>
                        <div
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-2xl px-4 py-3 transition-colors"
                          style={isNext
                            ? { background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' }
                            : undefined}
                        >
                          <div className="min-w-0 flex-1 basis-52">
                            {isNext && <p className="lp-eyebrow mb-1">{t('materials.nextUp')}</p>}
                            <h3 className="truncate font-semibold" style={{ color: 'var(--ink)' }}>{m.title}</h3>
                            <p className="truncate text-sm" style={{ color: done ? '#16a34a' : partial ? '#d97706' : 'var(--ink-soft)' }}>
                              {done ? t('materials.completed') : partial ? t('materials.inProgress', { slide: m.my_slide }) : (m.description || `${m.language} · ${m.level}`)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewing(m)}
                              className={`${isNext ? 'lp-btn-primary' : 'lp-btn-secondary'} whitespace-nowrap text-sm`}
                              style={{ padding: '0.5rem 1rem' }}
                            >
                              <ExternalLink size={15} /> {t('materials.openFile')}
                            </button>
                            <button type="button" onClick={() => downloadFile(m.file, m.file_name)} className="lp-btn-secondary justify-center" style={{ padding: '0.5rem 0.7rem' }} title={t('materials.download')} aria-label={t('materials.download')}>
                              <Download size={15} />
                            </button>
                            {user?.is_superuser && (
                              <button type="button" onClick={() => handleDelete(m)} className="lp-btn-secondary justify-center" style={{ color: '#c1443d', padding: '0.5rem 0.7rem' }} title={t('materials.delete')} aria-label={t('materials.delete')}>
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </>
            )
          })()}
          </>
        )}
      </div>
      {viewing && <MaterialViewer material={viewing} onClose={() => setViewing(null)} t={t} />}
    </div>
  )
}
