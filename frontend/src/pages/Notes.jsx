import { Download, ExternalLink, NotebookPen, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { downloadText } from '../utils/downloadFile'
import { avatarUrl } from '../utils/images'

function NoteCard({ note, index, i18n, t }) {
  const [text, setText] = useState(note.text)
  const [state, setState] = useState('idle')
  const date = new Date(note.scheduled_time).toLocaleDateString(i18n.resolvedLanguage, { year: 'numeric', month: 'short', day: 'numeric' })

  // saved when the box loses focus, like before
  const save = async () => {
    if (text === note.text) return
    setState('saving')
    try {
      await client.put(`/sessions/${note.session_id}/note/`, { text })
      note.text = text
      setState('saved')
    } catch {
      setState('error')
    }
  }

  return (
    <article className={`lp-card lp-card--hover lp-animate-in lp-delay-${Math.min(index + 1, 6)} flex flex-col`} style={{ padding: '1.1rem 1.25rem' }}>
      <div className="mb-3 flex items-center gap-3">
        <img src={avatarUrl(note.other.id, 70)} alt="" className="lp-avatar h-10 w-10 shrink-0 object-cover" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold" style={{ color: 'var(--ink)' }}>{note.other.full_name}</h2>
          <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{date}</p>
        </div>
        <Link
          to={`/sessions/${note.session_id}/summary`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
          style={{ color: 'var(--accent)' }}
          title={t('notes.openSession')}
        >
          <ExternalLink size={16} />
        </Link>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setState('idle') }}
        onBlur={save}
        rows={Math.min(8, Math.max(3, text.split('\n').length + 1))}
        className="w-full flex-1 resize-none rounded-2xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        style={{ border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)' }}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium" style={{ color: state === 'error' ? '#f87171' : state === 'saved' ? '#34d399' : 'var(--ink-soft)' }}>
          {state === 'saving' ? t('notes.saving') : state === 'saved' ? t('notes.saved') : state === 'error' ? t('notes.error') : ''}
        </span>
        <button
          type="button"
          onClick={() => downloadText(`notes-${note.other.full_name.replace(/\s+/g, '-')}-${date}.txt`, text)}
          className="lp-btn-secondary text-xs"
          style={{ padding: '0.45rem 0.95rem' }}
        >
          <Download size={13} /> {t('notes.download')}
        </button>
      </div>
    </article>
  )
}

export default function Notes() {
  const { t, i18n } = useTranslation()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    client.get('/sessions/notes/')
      .then(({ data }) => setNotes(data))
      .finally(() => setLoading(false))
  }, [])

  const q = query.trim().toLowerCase()
  const shown = notes.filter((n) => !q || n.text.toLowerCase().includes(q) || n.other.full_name.toLowerCase().includes(q))

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="mx-auto max-w-6xl px-6 pb-6 pt-10">
          <div className="lp-animate-in flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="lp-eyebrow mb-3">{t('notes.eyebrow')}</p>
              <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: 'var(--ink)' }}>{t('notes.title')}</h1>
              <p className="mt-2 max-w-md text-sm sm:text-base" style={{ color: 'var(--ink-soft)' }}>{t('notes.subtitle')}</p>
            </div>
            {notes.length > 0 && (
              <div className="relative w-full sm:w-72">
                <Search size={15} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-soft)' }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('notes.search')}
                  className="h-11 w-full rounded-full ps-11 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-14 pt-2">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((n) => <div key={n} className="lp-card h-48 animate-pulse" />)}
          </div>
        ) : notes.length === 0 ? (
          <div className="lp-card lp-animate-in mx-auto max-w-xl py-14 text-center">
            <span className="lp-icon-badge mx-auto mb-4 h-14 w-14"><NotebookPen size={22} /></span>
            <p className="mx-auto max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>{t('notes.empty')}</p>
            <Link to="/partners" className="lp-btn-primary mt-6 text-sm">{t('schedule.findPartners')}</Link>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('notes.noResults')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {shown.map((n, i) => <NoteCard key={n.session_id} note={n} index={i} i18n={i18n} t={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}
