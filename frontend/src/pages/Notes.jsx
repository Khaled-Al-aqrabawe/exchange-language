import { Download, NotebookPen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { downloadText } from '../utils/downloadFile'

function NoteCard({ note, i18n, t }) {
  const [text, setText] = useState(note.text)
  const [state, setState] = useState('idle')
  const date = new Date(note.scheduled_time).toLocaleDateString(i18n.resolvedLanguage, { year: 'numeric', month: 'short', day: 'numeric' })

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
    <div className="lp-surface p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{t('notes.with', { name: note.other.full_name })}</h2>
          <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{date}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs" style={{ color: state === 'error' ? '#c1443d' : 'var(--ink-soft)' }}>
            {state === 'saving' ? t('notes.saving') : state === 'saved' ? t('notes.saved') : state === 'error' ? t('notes.error') : ''}
          </span>
          <button
            type="button"
            onClick={() => downloadText(`notes-${note.other.full_name.replace(/\s+/g, '-')}-${date}.txt`, text)}
            className="lp-btn-secondary text-sm"
          >
            <Download size={14} /> {t('notes.download')}
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setState('idle') }}
        onBlur={save}
        rows={Math.min(12, Math.max(4, text.split('\n').length + 1))}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
      />
    </div>
  )
}

export default function Notes() {
  const { t, i18n } = useTranslation()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/sessions/notes/')
      .then(({ data }) => setNotes(data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-6 lp-animate-in">
          <div className="lp-icon-badge mb-3">
            <NotebookPen size={18} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--ink)' }}>{t('notes.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('notes.subtitle')}</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 pb-14 grid gap-4">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('common.loading')}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('notes.empty')}</p>
        ) : (
          notes.map((n) => <NoteCard key={n.session_id} note={n} i18n={i18n} t={t} />)
        )}
      </div>
    </div>
  )
}
