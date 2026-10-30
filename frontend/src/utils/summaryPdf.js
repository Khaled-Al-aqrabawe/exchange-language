// Turns the /sessions/<id>/summary/ response into a designed A4 PDF. The page is laid out as HTML
// (so Arabic and other right-to-left text is shaped by the browser) and then cut into pages.

const PAGE_W = 794 // A4 at 96dpi
const PAGE_H = 1123
const MARGIN_Y = 48
const ACCENT = '#0f766e'

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const section = (title, body) => `
  <div data-block style="margin:26px 0 10px;display:flex;align-items:center;gap:10px">
    <span style="width:5px;height:20px;border-radius:3px;background:${ACCENT}"></span>
    <span style="font-size:15px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#0f172a">${escapeHtml(title)}</span>
  </div>${body}`

const muted = (text) => `<div data-block style="color:#64748b;font-size:13px;font-style:italic;padding:4px 0 0 15px">${escapeHtml(text)}</div>`

function buildHtml(summary, t, locale, words) {
  const fmt = (value) => new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
  const { session, note, chat, files, my_rating: rating } = summary
  const statusLabel = t(`summary.status.${session.status}`, session.status)

  const fileRows = files.length === 0 ? muted(t('summary.noFiles')) : files.map((f) => {
    const progress = f.my_status ? t(`summary.progress.${f.my_status}`, { slide: f.my_slide }) : ''
    return `<div data-block style="display:flex;justify-content:space-between;gap:12px;padding:9px 14px;margin-bottom:6px;border:1px solid #e2e8f0;border-radius:10px;background:#fff">
      <div><div style="font-weight:700;font-size:13.5px" dir="auto">${escapeHtml(f.title)}</div><div style="font-size:11.5px;color:#64748b">${escapeHtml(f.language)} · ${escapeHtml(f.level)}</div></div>
      <div style="font-size:12px;font-weight:700;color:${ACCENT};white-space:nowrap;align-self:center">${escapeHtml(progress)}</div></div>`
  }).join('')

  const wordRows = words.length === 0 ? '' : section(t('summary.words', 'Words you translated'), words.map((w) => `
    <div data-block style="display:flex;justify-content:space-between;gap:16px;padding:8px 14px;margin-bottom:5px;border-radius:10px;background:#f1f5f9">
      <span style="font-weight:700;font-size:14px" dir="auto">${escapeHtml(w.word)}</span>
      <span style="font-size:14px;color:${ACCENT};font-weight:600;text-align:end" dir="auto">${escapeHtml(w.translation)}</span></div>`).join(''))

  const noteLines = note.text.trim()
    ? note.text.trim().split('\n').map((line) => `<div data-block style="font-size:13.5px;line-height:1.7;padding:0 15px" dir="auto">${escapeHtml(line) || '&nbsp;'}</div>`).join('')
    : muted(t('summary.noNotes'))

  const chatRows = chat.length === 0 ? muted(t('summary.noChat')) : chat.map((m) => `
    <div data-block style="display:flex;flex-direction:column;align-items:${m.mine ? 'flex-end' : 'flex-start'};margin-bottom:7px">
      <div style="max-width:78%;padding:8px 13px;border-radius:14px;font-size:13px;line-height:1.5;${m.mine ? `background:${ACCENT};color:#fff` : 'background:#f1f5f9;color:#0f172a'}" dir="auto">${escapeHtml(m.text)}</div>
      <div style="font-size:10.5px;color:#94a3b8;margin-top:2px">${escapeHtml(m.mine ? t('summary.you') : m.sender)} · ${escapeHtml(fmt(m.created_at))}</div></div>`).join('')

  const ratingBlock = rating ? section(t('summary.rating'), `
    <div data-block style="padding:10px 14px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a">
      <div style="font-size:16px;font-weight:800;color:#b45309">${'★'.repeat(rating.score)}${'☆'.repeat(Math.max(0, 5 - rating.score))} <span style="font-size:13px">${rating.score}/5</span></div>
      ${rating.comment ? `<div style="font-size:13px;margin-top:4px" dir="auto">${escapeHtml(rating.comment)}</div>` : ''}</div>`) : ''

  return `
  <div data-block style="background:linear-gradient(135deg,${ACCENT},#115e59);color:#fff;padding:34px 40px 30px;margin:0 -40px">
    <div style="font-size:13px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;opacity:.85">LinguaHub</div>
    <div style="font-size:28px;font-weight:800;margin-top:8px;line-height:1.2" dir="auto">${escapeHtml(t('summary.title', { name: session.other.full_name }))}</div>
    <div style="margin-top:12px;display:flex;gap:10px;align-items:center;font-size:13px">
      <span>${escapeHtml(fmt(session.scheduled_time))}</span>
      <span style="padding:3px 12px;border-radius:999px;background:rgb(255 255 255 / .2);font-weight:700">${escapeHtml(statusLabel)}</span></div>
  </div>
  ${section(t('summary.files'), fileRows)}
  ${wordRows}
  ${section(t('summary.notes'), noteLines)}
  ${section(t('summary.chat'), chatRows)}
  ${ratingBlock}
  <div data-block style="margin-top:34px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">LinguaHub · ${escapeHtml(fmt(new Date()))}</div>`
}

// `words` are the translations picked during the call: [{ word, translation }].
export async function downloadSummaryPdf(filename, summary, t, locale, words = []) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px;padding:0 40px;box-sizing:border-box;background:#fff;color:#0f172a;font-family:var(--font-body,system-ui,sans-serif)`
  host.innerHTML = buildHtml(summary, t, locale, words)
  document.body.appendChild(host)
  try {
    await document.fonts?.ready
    const scale = 2
    const canvas = await html2canvas(host, { scale, backgroundColor: '#fff', useCORS: true })

    // break pages between blocks so no line of text is cut in half
    const hostTop = host.getBoundingClientRect().top
    const blocks = [...host.querySelectorAll('[data-block]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { top: r.top - hostTop, bottom: r.bottom - hostTop }
    })
    const breaks = [0]
    let start = 0
    blocks.forEach((b) => {
      const room = (breaks.length === 1 ? PAGE_H - MARGIN_Y : PAGE_H - MARGIN_Y * 2)
      if (b.bottom - start > room) {
        start = b.top > start ? b.top : start + room
        breaks.push(start)
      }
    })
    breaks.push(host.scrollHeight)

    const pdf = new jsPDF({ unit: 'px', format: [PAGE_W, PAGE_H], hotfixes: ['px_scaling'] })
    for (let p = 0; p < breaks.length - 1; p += 1) {
      const y0 = breaks[p]
      const h = breaks[p + 1] - y0
      if (h <= 0) continue
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = Math.ceil(h * scale)
      const ctx = slice.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(canvas, 0, y0 * scale, canvas.width, h * scale, 0, 0, canvas.width, h * scale)
      if (p > 0) pdf.addPage([PAGE_W, PAGE_H])
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, p === 0 ? 0 : MARGIN_Y, PAGE_W, h)
    }
    pdf.save(filename)
  } finally {
    host.remove()
  }
}
