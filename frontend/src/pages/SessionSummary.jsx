import { ArrowLeft, Download, FileText, MessageCircle, NotebookPen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import client from '../api/client'
import { buildSummaryText } from '../utils/sessionSummary'
import { downloadFile, downloadText } from '../utils/downloadFile'

function Section({ icon: Icon, title, children }) {
  return (
    <section className="lp-surface p-5">
      <h2 className="flex items-center gap-2 font-semibold mb-3" style={{ color: 'var(--ink)' }}>
        <Icon size={16} style={{ color: 'var(--accent)' }} /> {title}
      </h2>
      {children}
    </section>
  )
}

export default function SessionSummary() {
  const { t, i18n } = useTranslation()
  const { sessionId } = useParams()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    client.get(`/sessions/${sessionId}/summary/`)
      .then(({ data }) => setSummary(data))
      .catch(() => setError(true))
  }, [sessionId])

  if (error) return <div className="p-16 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('summary.notFound')}</div>
  if (!summary) return <div className="p-16 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('common.loading')}</div>

  const { session, note, chat, files } = summary
  const fmt = (value) => new Date(value).toLocaleString(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-6 lp-animate-in">
          <Link to="/schedule" className="inline-flex items-center gap-1.5 text-sm mb-3 hover:opacity-70" style={{ color: 'var(--ink-soft)' }}>
            <ArrowLeft size={14} /> {t('summary.back')}
          </Link>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl mb-1" style={{ color: 'var(--ink)' }}>
            {t('summary.title', { name: session.other.full_name })}
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
            {fmt(session.scheduled_time)} · {t(`summary.status.${session.status}`, session.status)}
          </p>
          <button
            type="button"
            onClick={() => downloadText(`session-summary-${session.id}.txt`, buildSummaryText(summary, t, i18n.resolvedLanguage))}
            className="lp-btn-primary"
          >
            <Download size={15} /> {t('summary.download')}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-14 grid gap-4">
        <Section icon={FileText} title={t('summary.files')}>
          {files.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('summary.noFiles')}</p>
          ) : (
            <ul className="grid gap-2">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm" style={{ color: 'var(--ink)' }}>
                  <span>
                    {f.title} <span style={{ color: 'var(--ink-soft)' }}>({f.language} · {f.level})</span>
                    {f.my_status && (
                      <span className="lp-tag ms-2">{t(`summary.progress.${f.my_status}`, { slide: f.my_slide })}</span>
                    )}
                  </span>
                  {f.file && (
                    <button type="button" onClick={() => downloadFile(f.file, f.file_name)} className="lp-btn-secondary text-xs">
                      <Download size={13} /> {t('materials.download')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={NotebookPen} title={t('summary.notes')}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: note.text.trim() ? 'var(--ink)' : 'var(--ink-soft)' }}>
            {note.text.trim() || t('summary.noNotes')}
          </p>
          {note.revisions.length > 1 && (
            <details className="mt-4">
              <summary className="text-sm font-semibold cursor-pointer" style={{ color: 'var(--accent)' }}>{t('summary.history')}</summary>
              <div className="grid gap-3 mt-3">
                {note.revisions.map((r, i) => (
                  <div key={r.created_at} className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>{t('summary.versionAt', { n: i + 1, time: fmt(r.created_at) })}</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ink)' }}>{r.text.trim() || '-'}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Section>

        <Section icon={MessageCircle} title={t('summary.chat')}>
          {chat.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('summary.noChat')}</p>
          ) : (
            <div className="grid gap-2">
              {chat.map((m) => (
                <p key={`${m.created_at}-${m.text}`} className="text-sm" style={{ color: 'var(--ink)' }}>
                  <span className="text-xs me-2" style={{ color: 'var(--ink-soft)' }}>{fmt(m.created_at)}</span>
                  <strong>{m.mine ? t('summary.you') : m.sender}:</strong> {m.text}
                </p>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
