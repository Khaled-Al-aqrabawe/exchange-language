// Turns the /sessions/<id>/summary/ response into a plain-text file the user can keep.
export function buildSummaryText(summary, t, locale) {
  const fmt = (value) => new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', hour12: true })
  const lines = []
  const { session, note, chat, files, my_rating: rating } = summary

  lines.push(t('summary.title', { name: session.other.full_name }))
  lines.push(`${fmt(session.scheduled_time)} - ${t(`summary.status.${session.status}`, session.status)}`)
  lines.push('')

  lines.push(`== ${t('summary.files')} ==`)
  if (files.length === 0) lines.push(t('summary.noFiles'))
  files.forEach((f) => {
    const progress = f.my_status ? ` - ${t(`summary.progress.${f.my_status}`, { slide: f.my_slide })}` : ''
    lines.push(`- ${f.title} (${f.language} ${f.level})${progress}`)
  })
  lines.push('')

  lines.push(`== ${t('summary.notes')} ==`)
  lines.push(note.text.trim() || t('summary.noNotes'))
  lines.push('')

  if (note.revisions.length > 1) {
    lines.push(`== ${t('summary.history')} ==`)
    note.revisions.forEach((r, i) => {
      lines.push(`[${t('summary.versionAt', { n: i + 1, time: fmt(r.created_at) })}]`)
      lines.push(r.text.trim() || '-')
      lines.push('')
    })
  }

  lines.push(`== ${t('summary.chat')} ==`)
  if (chat.length === 0) lines.push(t('summary.noChat'))
  chat.forEach((m) => lines.push(`[${fmt(m.created_at)}] ${m.mine ? t('summary.you') : m.sender}: ${m.text}`))

  if (rating) {
    lines.push('')
    lines.push(`== ${t('summary.rating')} ==`)
    lines.push(`${rating.score}/5${rating.comment ? ` - ${rating.comment}` : ''}`)
  }
  return lines.join('\n')
}
