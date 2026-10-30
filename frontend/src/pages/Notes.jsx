import { Download, NotebookPen, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { downloadText } from '../utils/downloadFile'
import { avatarUrl } from '../utils/images'

const saveColor = (state) => (state === 'error' ? '#f87171' : state === 'saved' ? '#34d399' : 'var(--ink-soft)')
const saveLabel = (state, t) => (state === 'saving' ? t('notes.saving') : state === 'saved' ? t('notes.saved') : state === 'error' ? t('notes.error') : '')

// a note from a past lesson (written in the call notepad)
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
        <span className="text-xs font-medium" style={{ color: saveColor(state) }}>{saveLabel(state, t)}</span>
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

// a free-form note, not tied to any lesson
function GeneralNoteCard({ note, index, i18n, t, onDelete }) {
  const [title, setTitle] = useState(note.title)
  const [text, setText] = useState(note.text)
  const [state, setState] = useState('idle')
  const date = new Date(note.updated_at).toLocaleDateString(i18n.resolvedLanguage, { year: 'numeric', month: 'short', day: 'numeric' })

  const save = async () => {
    if (title === note.title && text === note.text) return
    setState('saving')
    try {
      await client.put(`/sessions/general-notes/${note.id}/`, { title, text })
      note.title = title
      note.text = text
      setState('saved')
    } catch {
      setState('error')
    }
  }

  const remove = async () => {
    if (!window.confirm(t('notes.confirmDelete'))) return
    try {
      await client.delete(`/sessions/general-notes/${note.id}/`)
      onDelete(note.id)
    } catch {
      setState('error')
    }
  }

  return (
    <article className={`lp-card lp-card--hover lp-animate-in lp-delay-${Math.min(index + 1, 6)} flex flex-col`} style={{ padding: '1.1rem 1.25rem' }}>
      <div className="mb-3 flex items-center gap-3">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setState('idle') }}
          onBlur={save}
          maxLength={120}
          placeholder={t('notes.titlePlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold focus:outline-none"
          style={{ color: 'var(--ink)' }}
        />
        <span className="shrink-0 text-xs" style={{ color: 'var(--ink-soft)' }}>{date}</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setState('idle') }}
        onBlur={save}
        rows={Math.min(10, Math.max(4, text.split('\n').length + 1))}
        placeholder={t('notes.writeHere')}
        className="w-full flex-1 resize-none rounded-2xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        style={{ border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)' }}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium" style={{ color: saveColor(state) }}>{saveLabel(state, t)}</span>
        <div className="flex gap-2">
          <button type="button" onClick={remove} className="lp-btn-secondary text-xs" style={{ padding: '0.45rem 0.95rem' }}>
            <Trash2 size={13} /> {t('notes.delete')}
          </button>
          <button
            type="button"
            onClick={() => downloadText(`${(title || 'note').replace(/\s+/g, '-')}.txt`, text)}
            className="lp-btn-secondary text-xs"
            style={{ padding: '0.45rem 0.95rem' }}
          >
            <Download size={13} /> {t('notes.download')}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function Notes() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('general')
  const [general, setGeneral] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    Promise.all([
      client.get('/sessions/general-notes/').then(({ data }) => setGeneral(data)),
      client.get('/sessions/notes/').then(({ data }) => setNotes(data)),
    ]).finally(() => setLoading(false))
  }, [])

  const addNote = async () => {
    const { data } = await client.post('/sessions/general-notes/', { title: '', text: '' })
    setGeneral((list) => [data, ...list])
  }

  const q = query.trim().toLowerCase()
  const shownGeneral = general.filter((n) => !q || n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
  const shown = notes.filter((n) => !q || n.text.toLowerCase().includes(q) || n.other.full_name.toLowerCase().includes(q))

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="mx-auto max-w-6xl px-6 pb-6 pt-10">
          <div className="lp-animate-in flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: 'var(--ink)' }}>{t('notes.title')}</h1>
              <p className="mt-2 max-w-md text-sm sm:text-base" style={{ color: 'var(--ink-soft)' }}>{t('notes.subtitle')}</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={15} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-soft)' }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('notes.search')}
                  className="h-11 w-full rounded-full ps-11 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
              </div>
              {tab === 'general' && (
                <button type="button" onClick={addNote} className="lp-btn-primary text-sm"><Plus size={16} /> {t('notes.newNote')}</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-14 pt-2">
        <div className="mb-5 flex gap-2">
          {[['general', t('notes.tabGeneral'), general.length], ['sessions', t('notes.tabSessions'), notes.length]].map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
              style={tab === key
                ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)' }
                : { background: 'var(--surface-2)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
            >
              {label} <span className="opacity-70">{count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((n) => <div key={n} className="lp-card h-48 animate-pulse" />)}
          </div>
        ) : tab === 'general' ? (
          general.length === 0 ? (
            <div className="lp-card lp-animate-in mx-auto max-w-xl py-14 text-center">
              <span className="lp-icon-badge mx-auto mb-4 h-14 w-14"><NotebookPen size={22} /></span>
              <p className="mx-auto max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>{t('notes.emptyGeneral')}</p>
              <button type="button" onClick={addNote} className="lp-btn-primary mt-6 text-sm"><Plus size={16} /> {t('notes.newNote')}</button>
            </div>
          ) : shownGeneral.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('notes.noResults')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {shownGeneral.map((n, i) => (
                <GeneralNoteCard key={n.id} note={n} index={i} i18n={i18n} t={t} onDelete={(id) => setGeneral((list) => list.filter((x) => x.id !== id))} />
              ))}
            </div>
          )
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
