import { Check, Clock, Download, FileText, Flag, Languages, MessageCircle, MessageSquareText, NotebookPen, Share2, MousePointer2, Pen, Send, Star, Trash2, Type, Undo2, Volume2, Maximize, Mic, MicOff, Minimize, MonitorUp, PhoneOff, Video, VideoOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import client, { wsUrl } from '../api/client'
import { LOW_RATING_MAX, SPEECH_LANGUAGES } from '../constants'
import { useAuth } from '../context/AuthContext'
import { downloadFile, downloadText } from '../utils/downloadFile'
import { buildSummaryText } from '../utils/sessionSummary'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

const statusKeys = {
  connecting: 'call.connecting',
  connected: 'call.connected',
  waiting: 'call.waitingForPartner',
  joined: 'call.partnerJoined',
  ended: 'call.callEnded',
  left: 'call.partnerLeft',
}

// A live session is 50 minutes: two turns of 25, the requester goes first.
const TURN_MS = 25 * 60 * 1000

// Lets a small video box be dragged around inside the call stage (mouse and touch).
function useDraggable(stageRef) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef(null)

  const onPointerDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      px: e.clientX,
      py: e.clientY,
      ox: offset.x,
      oy: offset.y,
      box: e.currentTarget.getBoundingClientRect(),
      stage: stageRef.current?.getBoundingClientRect(),
    }
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    let dx = e.clientX - d.px
    let dy = e.clientY - d.py
    if (d.stage) {
      // keep the box inside the stage
      dx = Math.min(Math.max(dx, d.stage.left - d.box.left), d.stage.right - d.box.right)
      dy = Math.min(Math.max(dy, d.stage.top - d.box.top), d.stage.bottom - d.box.bottom)
    }
    setOffset({ x: d.ox + dx, y: d.oy + dy })
  }

  const onPointerUp = () => { drag.current = null }

  return {
    style: { transform: `translate(${offset.x}px, ${offset.y}px)`, touchAction: 'none', cursor: 'grab' },
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}

// A refresh must put the user straight back into the call, so the joined state, mic/camera
// choice and the shared clock start are kept in sessionStorage for this room.
function readCallState(roomId) {
  try {
    return JSON.parse(sessionStorage.getItem(`call-${roomId}`)) || null
  } catch {
    return null
  }
}

function writeCallState(roomId, patch) {
  try {
    const next = patch === null ? null : { ...readCallState(roomId), ...patch }
    if (next) sessionStorage.setItem(`call-${roomId}`, JSON.stringify(next))
    else sessionStorage.removeItem(`call-${roomId}`)
  } catch {
    // storage unavailable - the call still works, it just won't survive a refresh
  }
}

function formatClock(totalSeconds) {
  const secs = Math.max(0, totalSeconds)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
const OFFICE_EXTENSIONS = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx']

const PEN_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#facc15']

// A transparent canvas over the shared file. Points are stored as fractions of the
// canvas size, so a drawing lines up on screens of different sizes.
function AnnotationLayer({ active, tool, color, strokes, onDraw, onUpdate, onDelete }) {
  const canvasRef = useRef(null)
  const current = useRef(null)
  const bounds = useRef({})
  const drag = useRef(null)
  const [textAt, setTextAt] = useState(null)
  const [textValue, setTextValue] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selBox, setSelBox] = useState(null)

  const paint = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    bounds.current = {}
    strokes.forEach((stroke) => {
      if (stroke.type !== 'text') {
        const xs = stroke.pts.map(([x]) => x * width)
        const ys = stroke.pts.map(([, y]) => y * height)
        bounds.current[stroke.id] = {
          x: Math.min(...xs) - 6, y: Math.min(...ys) - 6, w: Math.max(...xs) - Math.min(...xs) + 12, h: Math.max(...ys) - Math.min(...ys) + 12,
        }
      }
      if (stroke.type === 'text') {
        const px = stroke.size * height
        ctx.fillStyle = stroke.color
        ctx.font = `600 ${px}px sans-serif`
        ctx.textBaseline = 'middle'
        const x = stroke.x * width
        const y = stroke.y * height
        ctx.fillText(stroke.text, x, y)
        bounds.current[stroke.id] = { x: x - 4, y: y - px / 2 - 4, w: ctx.measureText(stroke.text).width + 8, h: px + 8 }
        return
      }
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.w
      ctx.beginPath()
      stroke.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * width, y * height) : ctx.moveTo(x * width, y * height)))
      if (stroke.pts.length === 1) ctx.lineTo(stroke.pts[0][0] * width + 0.1, stroke.pts[0][1] * height)
      ctx.stroke()
    })
    const box = selectedId && bounds.current[selectedId]
    if (box) {
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.strokeRect(box.x, box.y, box.w, box.h)
    }
    setSelBox((old) => (box && (!old || old.x !== box.x || old.y !== box.y || old.w !== box.w) ? box : box ? old : null))
  }

  useEffect(() => {
    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [strokes, selectedId])

  // leaving the select tool drops the selection
  useEffect(() => {
    if (tool !== 'select' || !active) setSelectedId(null)
  }, [tool, active])

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]
  }

  // Distance from a point to a line segment, in pixels.
  const distToSegment = (px, py, [ax, ay], [bx, by]) => {
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.min(Math.max(((px - ax) * dx + (py - ay) * dy) / len2, 0), 1) : 0
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
  }

  // The top-most text or pen stroke under the pointer, if any.
  const hitAny = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    for (let i = strokes.length - 1; i >= 0; i -= 1) {
      const stroke = strokes[i]
      if (stroke.type === 'text') {
        const b = bounds.current[stroke.id]
        if (b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return stroke.id
      } else {
        const pts = stroke.pts.map(([x, y]) => [x * rect.width, y * rect.height])
        const near = pts.length === 1
          ? Math.hypot(px - pts[0][0], py - pts[0][1]) <= 9
          : pts.some((pt, k) => k > 0 && distToSegment(px, py, pts[k - 1], pt) <= 9)
        if (near) return stroke.id
      }
    }
    return undefined
  }

  const flush = () => {
    const c = current.current
    if (!c || !c.pending.length) return
    onDraw({ id: c.id, color: c.color, w: c.w, pts: c.pending })
    c.pending = []
    c.last = performance.now()
  }

  const closeInput = () => {
    setTextAt(null)
    setTextValue('')
    setEditingId(null)
  }

  const commitText = () => {
    const value = textValue.trim()
    if (editingId) {
      if (value) onUpdate(editingId, { text: value })
      else onDelete(editingId)
    } else if (value && textAt) {
      onDraw({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'text', x: textAt[0], y: textAt[1], text: value, color, size: 0.024 })
    }
    closeInput()
  }

  const onPointerDown = (e) => {
    if (tool === 'text') {
      e.preventDefault()
      commitText()
      setTextAt(point(e))
      return
    }
    if (tool === 'select') {
      const id = hitAny(e)
      setSelectedId(id || null)
      const stroke = strokes.find((st) => st.id === id)
      if (stroke?.type === 'text') {
        e.currentTarget.setPointerCapture(e.pointerId)
        const [px, py] = point(e)
        drag.current = { id, dx: stroke.x - px, dy: stroke.y - py, started: false }
      }
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    current.current = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, color, w: 3, last: 0, pending: [point(e)] }
    flush()
  }
  const onPointerMove = (e) => {
    if (drag.current) {
      const [px, py] = point(e)
      // only the first step of a drag is recorded for undo
      onUpdate(drag.current.id, { x: Math.min(Math.max(px + drag.current.dx, 0), 1), y: Math.min(Math.max(py + drag.current.dy, 0), 1) }, !drag.current.started)
      drag.current.started = true
      return
    }
    const c = current.current
    if (!c) return
    c.pending.push(point(e))
    if (performance.now() - c.last > 40) flush()
  }
  const onPointerUp = () => {
    drag.current = null
    flush()
    current.current = null
  }

  const onDoubleClick = (e) => {
    if (tool !== 'select') return
    const id = hitAny(e)
    if (!id) return
    const stroke = strokes.find((st) => st.id === id)
    if (stroke.type !== 'text') return
    setEditingId(id)
    setTextValue(stroke.text)
    setTextAt([stroke.x, stroke.y])
  }

  const selected = strokes.find((st) => st.id === selectedId)
  const resize = (factor) => onUpdate(selectedId, { size: Math.min(Math.max(selected.size * factor, 0.012), 0.12) })

  // Delete / Backspace removes the selected text
  useEffect(() => {
    if (!selectedId || textAt) return undefined
    const onKey = (e) => {
      // never act while the user is typing in the notepad or another field
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        onDelete(selectedId)
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, textAt])

  const inputColor = editingId ? selected?.color || color : color

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full z-[6]"
        style={{
          pointerEvents: active ? 'auto' : 'none',
          cursor: tool === 'text' ? 'text' : tool === 'select' ? 'default' : 'crosshair',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      />
      {active && textAt && (
        <input
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText()
            if (e.key === 'Escape') closeInput()
          }}
          onBlur={commitText}
          className="absolute z-[7] w-52 rounded-md bg-black/70 px-2 py-1 text-sm text-white focus:outline-none"
          style={{ left: `${textAt[0] * 100}%`, top: `${textAt[1] * 100}%`, transform: 'translateY(-50%)', border: `2px solid ${inputColor}` }}
        />
      )}
      {active && tool === 'select' && selected && selBox && !textAt && (
        <div
          className="absolute z-[7] flex items-center gap-1 rounded-full bg-slate-900/90 px-1.5 py-1"
          style={{ left: selBox.x, top: Math.max(selBox.y - 36, 2) }}
        >
          {selected.type === 'text' && (
            <>
              <button type="button" onClick={() => resize(1 / 1.2)} className="h-6 w-6 rounded-full text-xs font-bold text-white hover:bg-white/15">A-</button>
              <button type="button" onClick={() => resize(1.2)} className="h-6 w-6 rounded-full text-sm font-bold text-white hover:bg-white/15">A+</button>
            </>
          )}
          <button
            type="button"
            onClick={() => { onDelete(selectedId); setSelectedId(null) }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-red-400 hover:bg-white/15"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </>
  )
}

// Pen / text / colour / clear buttons, used in the shared-file header and over a shared screen.
function AnnotationToolbar({ pen, t }) {
  const toolButton = (name, Icon, title) => (
    <button
      type="button"
      onClick={() => pen.onTool(name)}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${pen.on && pen.tool === name ? 'bg-[var(--accent)] text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
      title={title}
    >
      <Icon size={14} />
    </button>
  )
  return (
    <>
      {pen.on && PEN_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => pen.onColor(c)}
          className="h-5 w-5 rounded-full transition-transform hover:scale-110"
          style={{ background: c, outline: pen.color === c ? '2px solid #fff' : 'none', outlineOffset: '1px' }}
          aria-label={c}
        />
      ))}
      {toolButton('pen', Pen, t('call.pen'))}
      {toolButton('text', Type, t('call.text'))}
      {toolButton('select', MousePointer2, t('call.selectText'))}
      <button
        type="button"
        onClick={pen.onUndo}
        disabled={!pen.canUndo}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors"
        title={t('call.undo')}
      >
        <Undo2 size={14} />
      </button>
    </>
  )
}

function SharedMaterialStage({ material, onClose, onFinish, pen, fullWidth, t }) {
  const name = material.file_name || material.title
  const ext = name.split('.').pop()?.toLowerCase()
  const isImage = IMAGE_EXTENSIONS.includes(ext)
  const isPdf = ext === 'pdf'
  const isTextLike = ['txt', 'md', 'csv'].includes(ext)
  const isOffice = OFFICE_EXTENSIONS.includes(ext)
  // Office Online can only fetch publicly reachable URLs, so it won't work on localhost
  const isLocal = ['localhost', '127.0.0.1'].includes(new URL(material.file, window.location.href).hostname)
  const canEmbed = isImage || isPdf || isTextLike || (isOffice && !isLocal)
  // Browsers may have cached an old blocked (X-Frame-Options: DENY) response
  // for this exact URL from before that header was removed server-side - a
  // fixed query param forces a fresh request instead of reusing that cache entry.
  const embedSrc = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(material.file)}&wdAr=1.7777777777777777${material.start_slide > 1 ? `&wdStartOn=${material.start_slide}` : ''}`
    : `${material.file}${material.file.includes('?') ? '&' : '?'}embed=1`

  return (
    <div className={`absolute inset-y-0 start-0 ${fullWidth ? 'end-0' : 'end-[9.75rem]'} z-10 flex flex-col bg-slate-900 lp-animate-in-scale`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.1)' }}>
        <span className="inline-flex items-center gap-2 min-w-0 text-sm text-white">
          <FileText size={15} className="shrink-0 text-slate-400" />
          <span className="truncate">
            <span className="text-slate-400">{t(material.from === 'you' ? 'materials.sharedByYou' : 'materials.sharedByPartner')}: </span>
            {material.title}
          </span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <AnnotationToolbar pen={pen} t={t} />
          {material.start_slide > 1 && (
            <span className="text-xs text-amber-300">{t('call.startAtSlide', { n: material.start_slide })}</span>
          )}
          {onFinish && (
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 h-8 text-xs font-medium text-white hover:bg-white/20 transition-colors"
            >
              <Check size={13} /> {t('call.finishLesson')}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            title={t('materials.stopSharing')}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {canEmbed ? (
          isImage ? (
            <img src={material.file} alt={material.title} className="w-full h-full object-contain bg-black" />
          ) : (
            <>
              <iframe src={embedSrc} title={material.title} className="w-full h-full bg-white border-0" />
              {/* Hides the viewer's own menu (download / print) and full-screen icons; same colour as its bar so it blends in. */}
              {isOffice && <div className="absolute bottom-0 end-0 z-[5] h-[30px] w-28" style={{ background: 'rgb(68 68 68)' }} />}
            </>
          )
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 h-full text-slate-400">
            <FileText size={32} />
            <p className="text-sm">{name}</p>
          </div>
        )}
        <AnnotationLayer active={pen.on} tool={pen.tool} color={pen.color} strokes={pen.strokes} onDraw={pen.onDraw} onUpdate={pen.onUpdate} onDelete={pen.onDelete} />
      </div>
    </div>
  )
}

const REPORT_REASONS = [
  'harassment', 'inappropriate_content', 'no_show', 'late_or_left_early', 'off_topic', 'technical', 'fake_profile', 'spam', 'other',
]

// Report a problem with the other person; the admin receives it with the chosen reason.
function ReportModal({ sessionId, partnerName, getRecording, onClose, onSent, t }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [uploading, setUploading] = useState(false)

  // After a report is sent the user leaves the call straight away.
  useEffect(() => {
    if (!sent) return undefined
    const id = setTimeout(onSent, 1500)
    return () => clearTimeout(id)
  }, [sent])

  const submit = async () => {
    if (!reason) {
      setError(t('report.chooseReason'))
      return
    }
    if (reason === 'other' && !details.trim()) {
      setError(t('report.detailsRequired'))
      return
    }
    setBusy(true)
    try {
      const { data } = await client.post(`/sessions/${sessionId}/report/`, { reason, details })
      // The reporter's recording of the session goes with the report so the admin can watch it.
      const clip = await getRecording()
      if (clip && clip.size > 0) {
        setUploading(true)
        const body = new FormData()
        body.append('recording', clip, 'lesson.webm')
        await client.post(`/sessions/${sessionId}/report/${data.id}/recording/`, body, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 }).catch(() => {})
      }
      setSent(true)
    } catch {
      setError(t('report.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-white/10 p-6">
        {sent ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-white mb-2">{t('report.sentTitle')}</p>
            <p className="text-sm text-slate-400 mb-5">{t('report.sentBody')}</p>
            <button onClick={onSent} className="lp-btn-primary w-full justify-center">{t('report.leaveNow')}</button>
          </div>
        ) : (
          <>
            <p className="text-lg font-semibold text-white mb-1">{t('report.title', { name: partnerName })}</p>
            <p className="text-sm text-slate-400 mb-4">{t('report.subtitle')}</p>
            <div className="flex flex-col gap-1.5 mb-4">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm cursor-pointer transition-colors ${reason === r ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === r}
                    onChange={() => { setReason(r); setError('') }}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {t(`report.reasons.${r}`)}
                </label>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder={t('report.detailsPlaceholder')}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            {error && <p className="text-sm mt-2" style={{ color: '#f87171' }}>{error}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg font-medium text-slate-400 hover:text-white transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={submit} disabled={busy} className="lp-btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {uploading ? t('report.uploading') : busy ? t('schedule.submitting') : t('report.send')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function speak(text, language) {
  const lang = SPEECH_LANGUAGES[language]
  if (!lang || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.85
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

const EDGE_PUNCTUATION = /^[\s.,;:!?()«»"“”'،؛؟\-–—]+|[\s.,;:!?()«»"“”'،؛؟\-–—]+$/g
const NON_LATIN_LANGUAGES = ['Arabic', 'Mandarin Chinese', 'Japanese', 'Korean', 'Russian', 'Hindi']
const isLatinText = (text) => (text.match(/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/g) || []).length > text.replace(/\s/g, '').length / 2
// Arabic vowel marks and stretching confuse the translator, so they are removed before looking a word up
const stripArabicMarks = (text) => text.replace(/[\u064B-\u065F\u0670\u0640]/g, '')

// Click a word in the lesson's slide text (or select a phrase) to see its translation
// beside the slide and hear it spoken. The slide itself is drawn by another site's viewer,
// so its text is read from the file and shown here, where words can be picked.
function TranslatePanel({ material, source, target, onAddNote, t }) {
  const [slides, setSlides] = useState([])
  const [slideIndex, setSlideIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [recent, setRecent] = useState([])
  const [typed, setTyped] = useState('')
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!material?.id) {
      setSlides([])
      return
    }
    client.get(`/courses/materials/${material.id}/text/`)
      .then(({ data }) => {
        setSlides(data.slides)
        setSlideIndex(Math.max(0, (material.start_slide || 1) - 1))
      })
      .catch(() => setSlides([]))
  }, [material?.id])

  // `shown` is the spelling to display under the word (e.g. the transliteration that was clicked)
  const lookup = async (raw, shown) => {
    const word = raw.replace(EDGE_PUNCTUATION, '')
    if (!word) return
    speak(word, source)
    setAdded(false)
    setResult({ word, shown, loading: true })
    try {
      const text = source === 'Arabic' ? stripArabicMarks(word) : word
      const { data } = await client.get('/courses/translate/', { params: { text, source, target } })
      setResult({ word, shown, translation: data.translation })
      setRecent((list) => [{ word, shown, translation: data.translation }, ...list.filter((r) => r.word !== word)].slice(0, 8))
    } catch {
      setResult({ word, shown, error: true })
    }
  }

  // Lessons print the original, then its transliteration. Clicking a transliteration word
  // looks up the matching original word, which translates and is pronounced correctly.
  const pick = (lineIndex, wordIndex, word) => {
    const lines = slides[slideIndex] || []
    const previous = lines[lineIndex - 1]
    if (NON_LATIN_LANGUAGES.includes(source) && isLatinText(lines[lineIndex]) && previous && !isLatinText(previous)) {
      const original = previous.split(/\s+/).filter(Boolean)
      const sounds = lines[lineIndex].split(/\s+/).filter(Boolean)
      if (original.length === sounds.length) return lookup(original[wordIndex], word)
      return lookup(previous, lines[lineIndex])
    }
    return lookup(word)
  }

  // dragging over several words translates the whole phrase
  const onMouseUp = () => {
    const picked = window.getSelection()?.toString().trim()
    if (picked && /\s/.test(picked)) lookup(picked)
  }

  const lines = slides[slideIndex] || []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/10 p-4">
        {result ? (
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xl font-semibold leading-snug text-white" dir="auto">{result.word}</p>
                {result.shown && <p className="text-xs italic text-slate-400">{result.shown}</p>}
              </div>
              <button type="button" onClick={() => speak(result.word, source)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" title={t('translate.listen')}>
                <Volume2 size={15} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
              <p className="text-base font-medium" style={{ color: result.error ? '#f87171' : '#7dd3fc' }} dir="auto">
                {result.loading ? t('translate.loading') : result.error ? t('translate.error') : result.translation}
              </p>
              {result.translation && (
                <button type="button" onClick={() => speak(result.translation, target)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20" title={t('translate.listen')}>
                  <Volume2 size={13} />
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">{source} → {target}</p>
              {result.translation && (
                <button
                  type="button"
                  disabled={added}
                  onClick={() => { onAddNote(`${result.word} = ${result.translation}`); setAdded(true) }}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/20 disabled:opacity-60"
                >
                  {added ? t('translate.addedToNotes') : t('translate.addToNotes')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">{t('translate.hint')}</p>
        )}
      </div>

      {recent.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-2">
          {recent.map((r) => (
            <button
              key={r.word}
              type="button"
              onClick={() => { speak(r.word, source); setAdded(false); setResult(r) }}
              className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/20"
              dir="auto"
            >
              {r.word}
            </button>
          ))}
        </div>
      )}

      {slides.length > 0 ? (
        <>
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-slate-400">
            <button type="button" onClick={() => setSlideIndex((i) => Math.max(0, i - 1))} disabled={slideIndex === 0} className="rounded-full px-2 py-1 hover:bg-white/10 disabled:opacity-30">‹</button>
            <span>{t('translate.slide', { n: slideIndex + 1, total: slides.length })}</span>
            <button type="button" onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))} disabled={slideIndex === slides.length - 1} className="rounded-full px-2 py-1 hover:bg-white/10 disabled:opacity-30">›</button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4" onMouseUp={onMouseUp}>
            {lines.length === 0 && <p className="text-sm text-slate-500">{t('translate.emptySlide')}</p>}
            {lines.map((line, lineIndex) => {
              let wordIndex = -1
              return (
                <p key={`${lineIndex}-${line}`} dir="auto" className="text-sm leading-relaxed text-slate-200">
                  {line.split(/(\s+)/).map((part, i) => {
                    if (!/\S/.test(part)) return part
                    wordIndex += 1
                    const index = wordIndex
                    return <span key={i} onClick={() => pick(lineIndex, index, part)} className="cursor-pointer rounded px-0.5 hover:bg-white/15">{part}</span>
                  })}
                </p>
              )
            })}
          </div>
        </>
      ) : (
        <p className="flex-1 p-4 text-sm text-slate-500">{material?.id ? t('translate.noText') : t('translate.shareFirst')}</p>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); lookup(typed); setTyped('') }}
        className="flex gap-2 border-t border-white/10 p-3"
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={t('translate.placeholder')}
          dir="auto"
          className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <button type="submit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white" aria-label={t('translate.go')}>
          <Languages size={14} />
        </button>
      </form>
    </div>
  )
}

// The conversation with the other person, inside the call sidebar. It is the same chat
// as on the Messages page, so what is said here is also kept there.
function CallChat({ messages, onSend, myId, t }) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender.id === myId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <span
                className="max-w-[85%] rounded-2xl px-3 py-1.5 text-sm"
                style={mine ? { background: 'var(--accent)', color: '#fff' } : { background: 'rgb(255 255 255 / 0.1)', color: '#e2e8f0' }}
              >
                {m.text}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('call.chatPlaceholder')}
          className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <button type="submit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white" aria-label={t('call.chatSend')}>
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}

// Shown when leaving a session (completed or not) so each person can rate the other.
function CallRatingModal({ partnerName, onSubmit, onReport, onSummary, t }) {
  const [score, setScore] = useState(0)
  const [hoverScore, setHoverScore] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!score) {
      setError(t('schedule.ratingRequired'))
      return
    }
    if (score <= LOW_RATING_MAX && !comment.trim()) {
      setError(t('schedule.lowRatingReason'))
      return
    }
    setSubmitting(true)
    await onSubmit(score, comment.trim())
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6">
        <p className="text-lg font-semibold text-white mb-1">{t('schedule.rateModalTitle', { name: partnerName })}</p>
        <p className="text-sm text-slate-400 mb-4">{t('schedule.rateModalSubtitle')}</p>
        {(
          <div className="mb-4 rounded-xl bg-white/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{t('call.downloadsTitle')}</p>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={onSummary}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Download size={14} className="shrink-0 text-slate-300" /> <span className="truncate">{t('call.downloadSummary')}</span>
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => { setScore(value); setError('') }}
              onMouseEnter={() => setHoverScore(value)}
              onMouseLeave={() => setHoverScore(0)}
              aria-label={t('schedule.rateStars', { count: value })}
            >
              <Star size={28} fill={value <= (hoverScore || score) ? '#e6b422' : 'none'} style={{ color: '#e6b422' }} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={score && score <= LOW_RATING_MAX ? t('schedule.lowRatingPlaceholder') : t('schedule.rateCommentPlaceholder')}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        {error && <p className="text-sm mt-2" style={{ color: '#f87171' }}>{error}</p>}
        <div className="flex items-center justify-between gap-2 mt-5">
          <button type="button" onClick={onReport} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium hover:opacity-80" style={{ color: '#f87171' }}>
            <Flag size={14} /> {t('report.link')}
          </button>
          <div className="flex gap-2">
          <button onClick={submit} disabled={submitting} className="lp-btn-primary text-sm px-4 py-2 disabled:opacity-50">
            {submitting ? t('schedule.submitting') : t('schedule.rateSubmit')}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Call() {
  const { t, i18n } = useTranslation()
  const { roomId } = useParams()
  // Restored after a refresh so the user lands back inside the call.
  const [saved] = useState(() => readCallState(roomId))
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const stageRef = useRef(null)
  const rootRef = useRef(null)
  const localDrag = useDraggable(stageRef)
  const pcRef = useRef(null)
  const socketRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const cameraStreamRef = useRef(null)
  const previewStreamRef = useRef(null)
  const joinedRef = useRef(false)
  const micOnRef = useRef(!!saved?.mic)
  const camOnRef = useRef(!!saved?.cam)
  const screenSharingRef = useRef(false)
  const lobbyVideoRef = useRef(null)
  const screenStreamRef = useRef(null)

  const [joined, setJoined] = useState(() => !!saved?.joined)
  const [status, setStatus] = useState('connecting')
  const [micOn, setMicOn] = useState(!!saved?.mic)
  const [camOn, setCamOn] = useState(!!saved?.cam)
  const [error, setError] = useState('')
  const [screenSharing, setScreenSharing] = useState(false)
  const [screenShareError, setScreenShareError] = useState('')
  const [showMaterialPicker, setShowMaterialPicker] = useState(false)
  const [materials, setMaterials] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [sharedMaterial, setSharedMaterial] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Who asked for this session: from the call link (instant call) or the session's host.
  const [requester, setRequester] = useState(() => {
    const id = Number(searchParams.get('from'))
    return id ? { id, name: searchParams.get('name') || '' } : null
  })
  const [liveStart, setLiveStart] = useState(() => saved?.liveStart || null)
  const [now, setNow] = useState(() => Date.now())
  const [liveEnded, setLiveEnded] = useState(false)
  const [startNote, setStartNote] = useState('')
  const [finishPrompt, setFinishPrompt] = useState(null)
  const [stoppedSlide, setStoppedSlide] = useState('')
  const [promptError, setPromptError] = useState('')
  const sharedRef = useRef(null)
  const firedRef = useRef(new Set())

  const [sessionEndTime, setSessionEndTime] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [reminderBanner, setReminderBanner] = useState('')
  const [countdownValue, setCountdownValue] = useState(null)
  const [showCompletedBox, setShowCompletedBox] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)
  const [otherName, setOtherName] = useState('')
  const [otherId, setOtherId] = useState(null)
  const [sidebarTab, setSidebarTab] = useState('notes')
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  // The session is recorded in this browser (low quality) and thrown away on leaving,
  // unless a report is filed, in which case it is uploaded with the report.
  const recorderRef = useRef(null)
  const recordingRef = useRef({ done: null })
  const [recording, setRecording] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatUnread, setChatUnread] = useState(0)
  const [chatToast, setChatToast] = useState(null)
  const chatSocketRef = useRef(null)
  const chatVisibleRef = useRef(false)
  const [reportOpen, setReportOpen] = useState(false)
  // Who takes the first turn: the one who completed more lessons when both learn the same language.
  const [turnInfo, setTurnInfo] = useState(null)
  // Notepad sidebar (saved on the server per session) and the files shared during the call.
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteState, setNoteState] = useState('idle')
  const [sharedFiles, setSharedFiles] = useState([])
  const noteLoadedRef = useRef(false)
  const noteTextRef = useRef('')
  // Pen drawings on the shared file, shown on both screens.
  const [strokes, setStrokes] = useState([])
  const [penOn, setPenOn] = useState(false)
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [penTool, setPenTool] = useState('pen')
  const [remoteSharing, setRemoteSharing] = useState(false)
  // Undo history of my own drawing changes (added / edited / deleted), newest last.
  const historyRef = useRef([])
  const myStrokeIds = useRef(new Set())
  const strokesRef = useRef([])
  const [historyLen, setHistoryLen] = useState(0)
  // Whether the other person's camera is on (their box is hidden while it is off).
  const [remoteCamOn, setRemoteCamOn] = useState(true)

  const addStrokeChunk = (chunk) => {
    setStrokes((list) => {
      const i = list.findIndex((st) => st.id === chunk.id)
      if (i < 0) return [...list, chunk]
      const copy = [...list]
      copy[i] = { ...copy[i], pts: [...copy[i].pts, ...chunk.pts] }
      return copy
    })
  }

  const rememberFile = (material) => {
    setSharedFiles((list) => (list.some((f) => f.file === material.file) ? list : [...list, material]))
  }
  const [showLeaveChoice, setShowLeaveChoice] = useState(false)
  const reminder5FiredRef = useRef(false)
  const reminder30FiredRef = useRef(false)
  const autoEndedRef = useRef(false)

  useEffect(() => {
    client.get('/sessions/', { params: { room_id: roomId } })
      .then(({ data }) => {
        const session = data?.[0]
        if (!session) return
        const endTime = new Date(session.scheduled_time).getTime() + session.duration_minutes * 60000
        setSessionId(session.id)
        const otherPerson = session.host.id === user?.id ? session.partner : session.host
        setOtherName(otherPerson.full_name)
        setOtherId(otherPerson.id)
        setRequester((r) => r || { id: session.host.id, name: session.host.full_name })
        setSessionEndTime(endTime)
      })
      .catch(() => {})
  }, [roomId])

  // Lobby: the camera and microphone stay closed until the user turns one on.
  const ensurePreview = async () => {
    if (previewStreamRef.current) return previewStreamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    stream.getTracks().forEach((track) => { track.enabled = false })
    previewStreamRef.current = stream
    if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = stream
    return stream
  }

  // Leaving the lobby without joining must release a camera that was turned on.
  useEffect(() => () => {
    if (!joinedRef.current) previewStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  useEffect(() => {
    if (!joined) return undefined
    let cancelled = false
    let localStream

    async function start() {
      try {
        // Reuse the lobby preview (keeps the mic/camera choices); ask again if it was stopped.
        const preview = previewStreamRef.current
        localStream = preview && preview.getTracks().every((track) => track.readyState === 'live')
          ? preview
          : await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        previewStreamRef.current = null
        localStream.getAudioTracks().forEach((track) => { track.enabled = micOnRef.current })
        localStream.getVideoTracks().forEach((track) => { track.enabled = camOnRef.current })
      } catch {
        if (!cancelled) setError(t('call.micError'))
        return
      }
      if (cancelled) {
        localStream.getTracks().forEach((track) => track.stop())
        return
      }
      cameraStreamRef.current = localStream
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream

      // One connection per remote peer. When the other person refreshes and comes back,
      // the old connection is useless, so a fresh one is built for them.
      const buildPeer = () => {
        const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
        pcRef.current = peer
        pendingCandidatesRef.current = []
        localStream.getTracks().forEach((track) => peer.addTrack(track, localStream))

        peer.ontrack = (event) => {
          if (peer !== pcRef.current) return
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
          setStatus('connected')
        }

        peer.onicecandidate = (event) => {
          if (peer === pcRef.current && event.candidate) {
            send({ type: 'ice-candidate', candidate: event.candidate })
          }
        }

        peer.onconnectionstatechange = () => {
          if (peer !== pcRef.current) return
          if (peer.connectionState === 'connected') setStatus('connected')
          if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) {
            setStatus('ended')
          }
        }
        return peer
      }

      const replacePeer = () => {
        const old = pcRef.current
        const fresh = buildPeer()
        old?.close()
        return fresh
      }

      let pc = buildPeer()

      const socket = new WebSocket(wsUrl(`/ws/call/${roomId}/`))
      socketRef.current = socket

      socket.onopen = () => {
        if (!cancelled) setStatus('waiting')
      }

      socket.onmessage = async (event) => {
        if (cancelled) return
        const data = JSON.parse(event.data)

        if (data.event === 'peer-joined') {
          setStatus('joined')
          pc = replacePeer()
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          send({ type: 'offer', sdp: offer })
          send({ type: 'cam-state', on: camOnRef.current })
          send({ type: 'screen-state', on: screenSharingRef.current })
        } else if (data.type === 'offer') {
          if (pc.remoteDescription) pc = replacePeer()
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          await flushCandidates(pc)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          send({ type: 'answer', sdp: answer })
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          await flushCandidates(pc)
        } else if (data.type === 'ice-candidate' && data.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
          } else {
            pendingCandidatesRef.current.push(data.candidate)
          }
        } else if (data.type === 'material-share' && data.material) {
          setSharedMaterial({ ...data.material, from: 'partner' })
          setStrokes([])
          rememberFile(data.material)
        } else if (data.type === 'live-start') {
          setLiveStart((v) => v || Date.now())
        } else if (data.type === 'ask-finished' && data.material) {
          // only asked when this is also my own current lesson
          client.get('/courses/next/')
            .then(({ data: mine }) => {
              if (mine.material?.id === data.material.id) {
                setPromptError('')
                setFinishPrompt({ material: data.material, reason: 'joint' })
              }
            })
            .catch(() => {})
        } else if (data.type === 'screen-state') {
          setRemoteSharing(!!data.on)
          if (!data.on) setStrokes([])
        } else if (data.type === 'cam-state') {
          setRemoteCamOn(!!data.on)
        } else if (data.type === 'draw' && data.chunk) {
          addStrokeChunk(data.chunk)
        } else if (data.type === 'draw-update') {
          setStrokes((list) => list.map((st) => (st.id === data.id ? { ...st, ...data.patch } : st)))
        } else if (data.type === 'draw-delete') {
          setStrokes((list) => list.filter((st) => st.id !== data.id))
        } else if (data.type === 'draw-clear') {
          setStrokes([])
        } else if (data.type === 'material-share-stop') {
          setSharedMaterial(null)
          setStrokes([])
        } else if (data.event === 'peer-left') {
          // A refreshing partner leaves and rejoins within a moment: only treat it as a
          // real departure if no working connection has been re-established by then.
          setTimeout(() => {
            if (cancelled || pcRef.current?.connectionState === 'connected') return
            setStatus('left')
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
          }, 1500)
        }
      }

      socket.onclose = () => setStatus((s) => (s === 'connected' ? 'ended' : s))
    }

    async function flushCandidates(pc) {
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
      pendingCandidatesRef.current = []
    }

    function send(payload) {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(payload))
      }
    }

    start()

    return () => {
      cancelled = true
      socketRef.current?.close()
      socketRef.current = null
      pcRef.current?.close()
      pcRef.current = null
      localStream?.getTracks().forEach((track) => track.stop())
      screenStreamRef.current?.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
    }
  }, [roomId, t, joined])

  const send = (payload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload))
    }
  }

  const cleanupMedia = () => {
    socketRef.current?.close()
    pcRef.current?.close()
    cameraStreamRef.current?.getTracks().forEach((tr) => tr.stop())
    screenStreamRef.current?.getTracks().forEach((tr) => tr.stop())
  }

  const setSessionStatus = (statusValue) => {
    if (!sessionId) return Promise.resolve()
    return client.patch(`/sessions/${sessionId}/status/`, { status: statusValue }).catch(() => {})
  }

  useEffect(() => {
    if (!sessionEndTime) return
    const tick = () => {
      const msLeft = sessionEndTime - Date.now()

      if (msLeft > 0 && msLeft <= 5 * 60 * 1000 && !reminder5FiredRef.current) {
        reminder5FiredRef.current = true
        setReminderBanner(t('call.reminder5Min'))
        setTimeout(() => setReminderBanner(''), 6000)
      }
      if (msLeft > 0 && msLeft <= 30 * 1000 && !reminder30FiredRef.current) {
        reminder30FiredRef.current = true
        setReminderBanner(t('call.reminder30Sec'))
        setTimeout(() => setReminderBanner(''), 6000)
      }

      if (msLeft <= 10000 && msLeft > 0) {
        setCountdownValue(Math.ceil(msLeft / 1000))
      } else {
        setCountdownValue(null)
      }

      if (msLeft <= 0 && !autoEndedRef.current) {
        autoEndedRef.current = true
        setCountdownValue(null)
        setSessionStatus('completed')
        cleanupMedia()
        setShowCompletedBox(true)
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [sessionEndTime, sessionId, t])

  // Always lands on a real page: navigate(-1) does nothing when the call was opened
  // in a fresh tab (no history to go back to).
  const sidebarShown = notesOpen || (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches)
  chatVisibleRef.current = sidebarShown && sidebarTab === 'chat'

  // The chat connection stays open for the whole call, so a message can be announced
  // even while the chat tab is closed.
  useEffect(() => {
    if (!joined || !otherId) return undefined
    let cancelled = false
    let socket
    client.post('/chat/conversations/start/', { partner_id: otherId })
      .then(({ data }) => {
        if (cancelled) return
        client.get(`/chat/conversations/${data.id}/messages/`).then(({ data: history }) => {
          if (!cancelled) setChatMessages(history)
        })
        socket = new WebSocket(wsUrl(`/ws/chat/${data.id}/`))
        chatSocketRef.current = socket
        socket.onmessage = (event) => {
          const message = JSON.parse(event.data)
          setChatMessages((prev) => [...prev, message])
          if (message.sender.id !== user?.id && !chatVisibleRef.current) {
            setChatUnread((n) => n + 1)
            setChatToast(message)
          }
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
      socket?.close()
      chatSocketRef.current = null
    }
  }, [joined, otherId])

  const sendChat = (text) => {
    if (chatSocketRef.current?.readyState === WebSocket.OPEN) chatSocketRef.current.send(JSON.stringify({ text }))
  }

  // Looking at the chat clears its unread count; the pop-up fades by itself.
  useEffect(() => {
    if (sidebarShown && sidebarTab === 'chat') {
      setChatUnread(0)
      setChatToast(null)
    }
  }, [notesOpen, sidebarShown, sidebarTab, chatMessages.length])

  useEffect(() => {
    if (!chatToast) return undefined
    const id = setTimeout(() => setChatToast(null), 5000)
    return () => clearTimeout(id)
  }, [chatToast])

  const startRecording = () => {
    if (recorderRef.current || typeof MediaRecorder === 'undefined') return
    const remote = remoteVideoRef.current?.srcObject
    const local = cameraStreamRef.current
    if (!remote || remote.getVideoTracks().length === 0) return
    try {
      // one audio track with both voices, plus the picture of the other person (or their screen)
      const ctx = new AudioContext()
      const mix = ctx.createMediaStreamDestination()
      ;[remote, local].forEach((stream) => {
        if (stream?.getAudioTracks().length) ctx.createMediaStreamSource(stream).connect(mix)
      })
      const output = new MediaStream([...remote.getVideoTracks(), ...mix.stream.getAudioTracks()])
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m))
      const recorder = new MediaRecorder(output, { mimeType, videoBitsPerSecond: 300000, audioBitsPerSecond: 32000 })
      const chunks = []
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      recordingRef.current = {
        done: new Promise((resolve) => {
          recorder.onstop = () => {
            ctx.close().catch(() => {})
            resolve(new Blob(chunks, { type: 'video/webm' }))
          }
        }),
      }
      recorder.start(10000)
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      // recording is best effort and must never break the call
    }
  }

  const stopRecording = () => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    recorderRef.current = null
    setRecording(false)
  }

  useEffect(() => {
    if (joined && status === 'connected') startRecording()
  }, [joined, status])

  useEffect(() => () => stopRecording(), [])

  // Lesson text is translated from the lesson's language into one the user knows.
  const translateSource = sharedMaterial?.language || user?.profile?.learning_language || 'English'
  const translateTarget = [user?.profile?.native_language, ...(user?.profile?.spoken_languages || []), 'English']
    .find((l) => l && l !== translateSource) || 'English'

  const openSidebar = (tab) => {
    if (notesOpen && sidebarTab === tab) setNotesOpen(false)
    else {
      setSidebarTab(tab)
      setNotesOpen(true)
    }
  }

  const exitCall = () => {
    writeCallState(roomId, null)
    navigate(sessionId ? `/sessions/${sessionId}/summary` : '/partners', { replace: true })
  }

  const leaveAfterReport = () => {
    setReportOpen(false)
    setRatingOpen(false)
    if (noteLoadedRef.current) saveNote(noteTextRef.current)
    cleanupMedia()
    exitCall()
  }

  const downloadSummary = async () => {
    try {
      const { data } = await client.get(`/sessions/${sessionId}/summary/`)
      downloadText(`session-summary-${sessionId}.txt`, buildSummaryText(data, t, i18n.resolvedLanguage))
    } catch {
      // the summary page after leaving has the same download
    }
  }

  // Closes the call; the chance to rate the other person (when there is a session) comes next.
  const finishLeaving = () => {
    if (noteLoadedRef.current) saveNote(noteTextRef.current)
    stopRecording()
    cleanupMedia()
    if (sessionId) setRatingOpen(true)
    else exitCall()
  }

  // Leaving first asks "Finished this lesson?" about the lesson on screen (your own lesson,
  // or either one when studying together), so progress is saved even if the session ends early.
  const leaveCall = () => {
    const lesson = sharedRef.current
    if (lesson?.id && lesson.from === 'you' && !finishPrompt) {
      askFinished(lesson, 'leave')
      return
    }
    finishLeaving()
  }

  const submitRating = async (score, comment) => {
    try {
      await client.post(`/sessions/${sessionId}/rate/`, { score, comment })
    } catch {
      // rating is optional - never block leaving
    }
    exitCall()
  }

  const handleLeaveClick = () => {
    if (sessionEndTime && Date.now() < sessionEndTime && !autoEndedRef.current) {
      setShowLeaveChoice(true)
      return
    }
    leaveCall()
  }

  const chooseLeaveStatus = async (statusValue) => {
    setShowLeaveChoice(false)
    await setSessionStatus(statusValue)
    leaveCall()
  }

  // Turns a device on/off. In the lobby the first press asks the browser for the camera.
  const toggleDevice = async (kind) => {
    let stream = cameraStreamRef.current || previewStreamRef.current
    if (!stream) {
      try {
        stream = await ensurePreview()
      } catch {
        setError(t('call.micError'))
        return
      }
    }
    const on = kind === 'audio' ? micOn : camOn
    const tracks = kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks()
    tracks.forEach((track) => { track.enabled = !on })
    if (kind === 'audio') setMicOn(!on)
    else setCamOn(!on)
  }

  const toggleMic = () => toggleDevice('audio')
  const toggleCam = () => toggleDevice('video')

  const stopScreenShare = async () => {
    const pc = pcRef.current
    const sender = pc?.getSenders().find((s) => s.track && s.track.kind === 'video')
    screenStreamRef.current?.getTracks().forEach((tr) => tr.stop())
    screenStreamRef.current = null

    const camTrack = cameraStreamRef.current?.getVideoTracks()[0]
    if (sender && camTrack) await sender.replaceTrack(camTrack)
    if (localVideoRef.current && cameraStreamRef.current) localVideoRef.current.srcObject = cameraStreamRef.current
    setScreenSharing(false)
  }

  const toggleScreenShare = async () => {
    if (screenSharing) {
      await stopScreenShare()
      return
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]
      screenStreamRef.current = screenStream

      const pc = pcRef.current
      const sender = pc?.getSenders().find((s) => s.track && s.track.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream

      screenTrack.onended = () => stopScreenShare()
      setScreenSharing(true)
    } catch {
      setScreenShareError(t('call.screenShareError'))
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      rootRef.current?.requestFullscreen().catch(() => {})
    }
  }

  const openMaterialPicker = () => {
    setShowMaterialPicker(true)
    if (materials.length === 0) {
      setMaterialsLoading(true)
      client.get('/courses/materials/')
        .then(({ data }) => setMaterials(data))
        .finally(() => setMaterialsLoading(false))
    }
  }

  const shareMaterial = (m, startSlide = 1) => {
    const material = { id: m.id, title: m.title, file: m.file, file_name: m.file_name, start_slide: startSlide, language: m.language }
    send({ type: 'material-share', material })
    if (sessionId && material.id) client.post(`/sessions/${sessionId}/shared/`, { material_id: material.id }).catch(() => {})
    rememberFile(material)
    setStrokes([])
    setSharedMaterial({ ...material, from: 'you' })
    setShowMaterialPicker(false)
  }

  const closeSharedMaterial = () => {
    if (sharedMaterial?.from === 'you') {
      send({ type: 'material-share-stop' })
    }
    setSharedMaterial(null)
    setStrokes([])
    setPenOn(false)
  }

  // Opens the signed-in user's own next lesson (their turn's default file).
  const shareNextLesson = async () => {
    try {
      const { data } = await client.get('/courses/next/')
      if (data.material) shareMaterial(data.material, data.start_slide)
    } catch {
      // no default lesson - the user can still pick a file by hand
    }
  }

  const iAmRequester = !!requester && requester.id === user?.id

  useEffect(() => {
    if (joined) writeCallState(roomId, { joined: true, mic: micOn, cam: camOn })
  }, [joined, micOn, camOn, roomId])

  useEffect(() => {
    if (liveStart) writeCallState(roomId, { liveStart })
  }, [liveStart, roomId])
  noteTextRef.current = noteText

  const saveNote = (text) => {
    if (!sessionId) return Promise.resolve()
    setNoteState('saving')
    return client.put(`/sessions/${sessionId}/note/`, { text })
      .then(() => setNoteState('saved'))
      .catch(() => setNoteState('error'))
  }

  useEffect(() => {
    if (!sessionId) return
    client.get(`/sessions/${sessionId}/note/`)
      .then(({ data }) => {
        setNoteText((current) => current || data.text)
        noteLoadedRef.current = true
      })
      .catch(() => {})
  }, [sessionId])

  // Autosave about a second after the user stops typing.
  useEffect(() => {
    if (!noteLoadedRef.current) return undefined
    const id = setTimeout(() => saveNote(noteText), 1000)
    return () => clearTimeout(id)
  }, [noteText])
  micOnRef.current = micOn
  camOnRef.current = camOn
  screenSharingRef.current = screenSharing
  joinedRef.current = joined
  sharedRef.current = sharedMaterial

  // The requester starts the shared 50-minute clock once the call is connected.
  useEffect(() => {
    if (status !== 'connected' || !iAmRequester || liveStart) return
    setLiveStart(Date.now())
    send({ type: 'live-start' })
  }, [status, iAmRequester, liveStart])

  useEffect(() => {
    if (!liveStart) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [liveStart])

  const elapsedMs = liveStart ? Math.max(0, now - liveStart) : 0
  const liveTurn = Math.min(Math.floor(elapsedMs / TURN_MS), 1)
  const turnRemaining = liveStart ? Math.ceil((TURN_MS - (elapsedMs - liveTurn * TURN_MS)) / 1000) : null
  const firstUserId = turnInfo ? turnInfo.first_user_id : (sessionId ? null : requester?.id ?? null)
  const orderReady = firstUserId != null
  const iGoFirst = firstUserId === user?.id
  const isMyTurn = liveTurn === 0 ? iGoFirst : !iGoFirst
  const liveActive = !!liveStart && !!requester && orderReady && !liveEnded
  const turnCountdown = liveActive && turnRemaining > 0 && turnRemaining <= 60 && countdownValue == null ? turnRemaining : null

  const askFinished = (material, reason) => {
    setPromptError('')
    setFinishPrompt({ material, reason })
    // If the other person is on this same lesson too, they must confirm as well.
    if (reason !== 'leave') {
      send({ type: 'ask-finished', material: { id: material.id, title: material.title, file: material.file, file_name: material.file_name } })
    }
  }

  useEffect(() => {
    if (!sessionId) return
    client.get(`/sessions/${sessionId}/first-turn/`)
      .then(({ data }) => setTurnInfo(data))
      .catch(() => setTurnInfo({ first_user_id: requester?.id ?? null, same_language: false, counts: {} }))
  }, [sessionId])

  // Note of who sent the request, shown when the session starts.
  useEffect(() => {
    if (!liveStart || !requester || !orderReady) return undefined
    const byProgress = turnInfo?.same_language && turnInfo.counts[turnInfo.first_user_id] > Math.min(...Object.values(turnInfo.counts))
    const who = requester.name || t('call.yourPartner')
    setStartNote(
      byProgress
        ? t(iGoFirst ? 'call.youGoFirstProgress' : 'call.partnerGoesFirstProgress')
        : iAmRequester ? t('call.youStartedNote') : t('call.requestedByNote', { name: who }),
    )
    const id = setTimeout(() => setStartNote(''), 10000)
    return () => clearTimeout(id)
  }, [liveStart, requester?.id, orderReady])

  // A turn begins: its owner opens their next lesson; the previous owner is asked how it went.
  useEffect(() => {
    if (!liveStart || !requester || !orderReady) return
    const key = `turn-${liveTurn}`
    if (firedRef.current.has(key)) return
    firedRef.current.add(key)
    const prev = sharedRef.current
    if (liveTurn === 1 && !isMyTurn && prev?.from === 'you' && prev.id) askFinished(prev, 'turn')
    if (isMyTurn) shareNextLesson()
  }, [liveStart, liveTurn, requester?.id, orderReady])

  // Toasts at 10 and 20 minutes into each turn, and the end of the session.
  useEffect(() => {
    if (!liveStart || !requester || !orderReady) return
    const inTurnMin = (elapsedMs - liveTurn * TURN_MS) / 60000
    for (const mark of [10, 20]) {
      const key = `${liveTurn}-${mark}`
      if (inTurnMin >= mark && inTurnMin < mark + 1 && !firedRef.current.has(key)) {
        firedRef.current.add(key)
        setReminderBanner(t(isMyTurn ? 'call.turnElapsedMine' : 'call.turnElapsedPartner', { minutes: mark }))
        setTimeout(() => setReminderBanner(''), 6000)
      }
    }
    if (elapsedMs >= 2 * TURN_MS && !firedRef.current.has('end')) {
      firedRef.current.add('end')
      setLiveEnded(true)
      const mine = sharedRef.current
      if (isMyTurn && mine?.from === 'you' && mine.id) askFinished(mine, 'turn')
    }
  }, [now])

  const answerFinished = async (statusValue) => {
    const { material, reason } = finishPrompt
    const body = { material_id: material.id, status: statusValue }
    try {
      await client.post('/courses/progress/', body)
    } catch {
      setPromptError(t('call.progressError'))
      return
    }
    setFinishPrompt(null)
    if (reason === 'leave') finishLeaving()
    else if (statusValue === 'complete' && reason === 'next') shareNextLesson()
  }

  // Tell the other side whenever our camera turns on/off (and once the call connects).
  useEffect(() => {
    if (!joined || status !== 'connected') return undefined
    send({ type: 'cam-state', on: camOn })
    const id = setInterval(() => send({ type: 'cam-state', on: camOnRef.current }), 4000)
    return () => clearInterval(id)
  }, [joined, status, camOn])

  useEffect(() => {
    if (joined && status === 'connected') send({ type: 'screen-state', on: screenSharing })
    if (!screenSharing) setStrokes((list) => (list.length && !sharedRef.current ? [] : list))
  }, [joined, status, screenSharing])

  strokesRef.current = strokes

  // Undo entries only apply to the file/screen they were made on.
  const surfaceKey = () => sharedRef.current?.file || 'screen'
  const pushHistory = (entry) => {
    historyRef.current = [...historyRef.current.slice(-49), { ...entry, surface: surfaceKey() }]
    setHistoryLen(historyRef.current.length)
  }

  const drawLocal = (chunk) => {
    if (!myStrokeIds.current.has(chunk.id)) {
      myStrokeIds.current.add(chunk.id)
      pushHistory({ type: 'add', id: chunk.id })
    }
    addStrokeChunk(chunk)
    send({ type: 'draw', chunk })
  }

  const updateStroke = (id, patch, record = true) => {
    if (record) {
      const old = strokesRef.current.find((st) => st.id === id)
      if (old) pushHistory({ type: 'update', id, prev: Object.fromEntries(Object.keys(patch).map((k) => [k, old[k]])) })
    }
    setStrokes((list) => list.map((st) => (st.id === id ? { ...st, ...patch } : st)))
    send({ type: 'draw-update', id, patch })
  }

  const deleteStroke = (id, record = true) => {
    const old = strokesRef.current.find((st) => st.id === id)
    if (record && old) pushHistory({ type: 'delete', stroke: old })
    setStrokes((list) => list.filter((st) => st.id !== id))
    send({ type: 'draw-delete', id })
  }

  const undoDrawing = () => {
    const entry = historyRef.current[historyRef.current.length - 1]
    if (!entry) return
    historyRef.current = historyRef.current.slice(0, -1)
    setHistoryLen(historyRef.current.length)
    if (entry.surface !== surfaceKey()) return
    if (entry.type === 'add') deleteStroke(entry.id, false)
    else if (entry.type === 'update') updateStroke(entry.id, entry.prev, false)
    else if (entry.type === 'delete') {
      addStrokeChunk(entry.stroke)
      send({ type: 'draw', chunk: entry.stroke })
    }
  }

  const penApi = {
    on: penOn,
    tool: penTool,
    color: penColor,
    strokes,
    // choosing a tool turns drawing on; choosing the active tool again turns it off
    onTool: (name) => {
      if (penOn && penTool === name) setPenOn(false)
      else { setPenTool(name); setPenOn(true) }
    },
    onColor: setPenColor,
    onDraw: drawLocal,
    onUpdate: updateStroke,
    onDelete: deleteStroke,
    onUndo: undoDrawing,
    canUndo: historyLen > 0,
  }
  const screenAnnotating = (screenSharing || remoteSharing) && !sharedMaterial

  const isConnected = status === 'connected'
  const statusText = t(statusKeys[status] || statusKeys.connecting)

  const leaveLobby = () => {
    previewStreamRef.current?.getTracks().forEach((track) => track.stop())
    previewStreamRef.current = null
    navigate(sessionId ? '/schedule' : '/partners', { replace: true })
  }

  if (!joined) {
    return (
      <div className="bg-slate-950 min-h-[calc(100vh-4rem)]">
        <div className="max-w-xl mx-auto px-6 py-10 text-center">
          <h1 className="text-lg font-semibold text-white mb-1">{t('call.joinTitle')}</h1>
          <p className="text-sm text-slate-400 mb-2">{t('call.joinHint')}</p>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">{t('call.recordingNotice')}</p>
          {error ? (
            <div className="rounded-2xl border border-red-900/50 bg-red-950/40 px-5 py-4 text-red-300 text-sm">{error}</div>
          ) : (
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden" style={{ aspectRatio: '16 / 9', border: '1px solid rgb(255 255 255 / 0.1)' }}>
              <video ref={lobbyVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {!camOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 text-slate-400 text-sm">
                  <VideoOff size={32} />
                  {t('call.cameraOff')}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={toggleMic}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 ${
                micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'
              }`}
              title={micOn ? t('call.mute') : t('call.unmute')}
            >
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              onClick={toggleCam}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 ${
                camOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'
              }`}
              title={camOn ? t('call.turnOffCamera') : t('call.turnOnCamera')}
            >
              {camOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={leaveLobby} className="rounded-full px-6 h-11 text-sm font-medium text-slate-300 bg-white/10 hover:bg-white/20 transition-colors">
              {t('call.back')}
            </button>
            <button
              onClick={() => setJoined(true)}
              className="lp-btn-primary"
            >
              {t('call.joinNow')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      // the sidebar is always shown beside the call and takes its width, so the picture never sits under it
      className={`bg-slate-950 md:pe-80 ${isFullscreen ? 'h-screen overflow-y-auto' : 'min-h-[calc(100vh-4rem)]'}`}
    >
      <div className={`${isFullscreen ? 'max-w-none px-4 py-4' : 'max-w-5xl px-6 py-10'} mx-auto`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold text-white">{t('call.title')}</h1>
            {recording && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400" title={t('call.recordingNotice')}>
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {t('call.recordingBadge')}
              </span>
            )}
            {liveActive && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tabular-nums"
                style={{ background: isMyTurn ? 'var(--accent)' : 'rgb(255 255 255 / 0.1)', color: '#fff' }}
              >
                <Clock size={12} /> {isMyTurn ? t('call.yourTurn') : t('call.partnerTurn')} · {formatClock(turnRemaining)}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </span>
            {statusText}
          </span>
        </div>

        {startNote && (
          <div className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-3 text-sky-300 text-sm">
            {startNote}
          </div>
        )}

        {reminderBanner && (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-amber-300 text-sm">
            {reminderBanner}
          </div>
        )}

        {screenShareError && (
          <div className="mb-4 rounded-2xl border border-red-900/50 bg-red-950/40 px-5 py-3 text-red-300 text-sm">
            {screenShareError}
          </div>
        )}

        {error ? (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/40 px-5 py-4 text-red-300 text-sm">
            {error}
          </div>
        ) : (
          <div
            ref={stageRef}
            className="relative bg-slate-900 rounded-2xl overflow-hidden lp-animate-in-scale"
            style={{
              aspectRatio: '16 / 9',
              boxShadow: '0 24px 64px -20px rgb(0 0 0 / 0.6)',
              border: '1px solid rgb(255 255 255 / 0.1)',
              ...(isFullscreen ? { width: 'min(100%, calc((100vh - 9rem) * 16 / 9))', margin: '0 auto' } : {}),
            }}
          >
            {/* While a file is shared it covers the stage, so the other user shrinks into a box above yours. */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={sharedMaterial
                ? `absolute top-2 end-2 w-[8.5rem] aspect-[4/3] object-cover rounded-xl z-20 ${remoteCamOn ? '' : 'hidden'}`
                : screenSharing
                  ? `absolute bottom-4 end-4 w-40 aspect-[4/3] object-cover rounded-xl shadow-lg z-20 ${remoteCamOn ? '' : 'hidden'}`
                  : 'w-full h-full object-cover'}
              style={sharedMaterial || screenSharing ? { border: '2px solid var(--accent)' } : undefined}
            />
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                {statusText}
              </div>
            )}
            {sharedMaterial && (
              <SharedMaterialStage
                material={sharedMaterial}
                onClose={closeSharedMaterial}
                onFinish={sharedMaterial.from === 'you' && sharedMaterial.id ? () => askFinished(sharedMaterial, 'next') : undefined}
                pen={penApi}
                fullWidth={!(remoteCamOn || (camOn && !screenSharing))}
                t={t}
              />
            )}
            {screenAnnotating && (
              <>
                <AnnotationLayer active={penOn} tool={penTool} color={penColor} strokes={strokes} onDraw={drawLocal} onUpdate={penApi.onUpdate} onDelete={penApi.onDelete} />
                <div className="absolute top-3 start-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5">
                  <AnnotationToolbar pen={penApi} t={t} />
                </div>
              </>
            )}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={
                screenSharing && !sharedMaterial
                  // while sharing, this element shows the shared screen itself, filling the box like the other person sees it
                  ? 'absolute inset-0 z-[1] h-full w-full bg-black object-cover'
                  : `absolute ${sharedMaterial ? 'top-[7.5rem] end-2 w-[8.5rem] aspect-[4/3] object-cover' : 'bottom-4 end-4 w-40'} rounded-xl shadow-lg z-20 ${screenSharing || !camOn ? 'hidden' : ''}`
              }
              style={screenSharing && !sharedMaterial ? undefined : sharedMaterial ? { border: '2px solid var(--accent-2)' } : { border: '2px solid var(--accent-2)', ...localDrag.style }}
              {...(sharedMaterial || screenSharing ? {} : localDrag.handlers)}
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={toggleMic}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 ${
              micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'
            }`}
            title={micOn ? t('call.mute') : t('call.unmute')}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          <button
            onClick={toggleCam}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 ${
              camOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'
            }`}
            title={camOn ? t('call.turnOffCamera') : t('call.turnOnCamera')}
          >
            {camOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:scale-105"
            title={isFullscreen ? t('call.exitFullscreen') : t('call.fullscreen')}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          <div className="relative">
            {shareMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setShareMenuOpen(false)} />}
            {shareMenuOpen && (
              <div className="absolute bottom-full start-1/2 z-50 mb-3 w-60 -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-900 p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => { setShareMenuOpen(false); openMaterialPicker() }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-slate-100 hover:bg-white/10"
                >
                  <FileText size={16} className="shrink-0 text-slate-400" /> {t('call.shareFile')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShareMenuOpen(false); toggleScreenShare() }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-slate-100 hover:bg-white/10"
                >
                  <MonitorUp size={16} className="shrink-0 text-slate-400" /> {screenSharing ? t('call.stopSharingScreen') : t('call.shareScreen')}
                </button>
                {sharedMaterial?.from === 'you' && (
                  <button
                    type="button"
                    onClick={() => { setShareMenuOpen(false); closeSharedMaterial() }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-red-300 hover:bg-white/10"
                  >
                    <X size={16} className="shrink-0" /> {t('call.stopShareFile')}
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setShareMenuOpen((v) => !v)}
              className={`relative z-50 flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 ${
                screenSharing || sharedMaterial?.from === 'you' ? 'bg-[var(--accent)] text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={t('call.share')}
            >
              <Share2 size={18} />
            </button>
          </div>
          {/* One button for the sidebar; it opens on the chat when a message is waiting, otherwise where you left off. */}
          <button
            onClick={() => (notesOpen ? setNotesOpen(false) : openSidebar(chatUnread > 0 ? 'chat' : sidebarTab))}
            className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 md:hidden ${
              notesOpen ? 'bg-[var(--accent)] text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={t('call.chatAndNotes')}
          >
            <MessageSquareText size={18} />
            {chatUnread > 0 && (
              <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </button>
          <button
            onClick={handleLeaveClick}
            className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-6 text-white font-medium hover:bg-red-700 transition-all hover:scale-105"
          >
            <PhoneOff size={17} /> {t('call.leave')}
          </button>
        </div>
      </div>

      {showMaterialPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowMaterialPicker(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">{t('materials.pickMaterial')}</p>
              <button onClick={() => setShowMaterialPicker(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            {materialsLoading ? (
              <p className="text-sm text-slate-400">{t('materials.loading')}</p>
            ) : materials.length === 0 ? (
              <p className="text-sm text-slate-400">{t('materials.empty')}</p>
            ) : (
              <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5">
                {materials.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => shareMaterial(m)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <FileText size={15} className="shrink-0 text-slate-400" />
                    <span className="truncate">{m.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {countdownValue != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-none">
          <span className="font-display text-white font-bold tabular-nums" style={{ fontSize: '9rem', lineHeight: 1, textShadow: '0 8px 40px rgb(0 0 0 / 0.6)' }}>
            {countdownValue}
          </span>
        </div>
      )}

      {turnCountdown != null && (
        <div className="fixed inset-x-0 top-24 z-50 flex justify-center pointer-events-none">
          <span className="font-display text-white font-bold tabular-nums" style={{ fontSize: '5rem', lineHeight: 1, textShadow: '0 6px 30px rgb(0 0 0 / 0.7)' }}>
            {turnCountdown}
          </span>
        </div>
      )}

      {finishPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6">
            <p className="text-lg font-semibold text-white mb-1">{t('call.finishedTitle')}</p>
            <p className="text-sm text-slate-400 mb-5 truncate">{finishPrompt.material.title}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => answerFinished('complete')} className="lp-btn-primary w-full justify-center">
                {t('call.finishedYes')}
              </button>
              <button
                onClick={() => answerFinished('not_started')}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                {t('call.finishedNo')}
              </button>
              {finishPrompt.reason === 'leave' && (
                <button
                  onClick={() => { setFinishPrompt(null); finishLeaving() }}
                  className="w-full rounded-xl px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t('call.skipAndLeave')}
                </button>
              )}
            </div>
            {promptError && <p className="text-sm mt-3" style={{ color: '#f87171' }}>{promptError}</p>}
          </div>
        </div>
      )}

      {chatToast && (
        <button
          type="button"
          onClick={() => { setChatToast(null); openSidebar('chat') }}
          className="fixed top-20 start-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-slate-900 px-4 py-2 text-sm text-white shadow-lg lp-animate-in"
        >
          <MessageCircle size={15} style={{ color: 'var(--accent)' }} />
          <span className="max-w-[16rem] truncate"><strong>{chatToast.sender.full_name}:</strong> {chatToast.text}</span>
        </button>
      )}

      {(
        <aside className={`fixed ${isFullscreen ? 'top-0' : 'top-16'} bottom-0 end-0 z-40 w-80 max-w-full ${notesOpen ? 'flex' : 'hidden md:flex'} flex-col bg-slate-900 border-s border-white/10`}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
            <div className="flex items-center gap-1">
              {[['notes', NotebookPen, t('call.notes')], ['chat', MessageCircle, t('call.chat')], ['translate', Languages, t('call.translate')]].map(([tab, Icon, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSidebarTab(tab)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${sidebarTab === tab ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Icon size={13} /> {label}
                  {tab === 'chat' && chatUnread > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {chatUnread > 9 ? '9+' : chatUnread}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {sidebarTab === 'notes' && (
                <>
                  <span className="text-xs text-slate-400">
                    {!sessionId ? t('call.notesNotSaved') : noteState === 'saving' ? t('call.notesSaving') : noteState === 'saved' ? t('call.notesSaved') : noteState === 'error' ? t('call.notesError') : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadText('session-notes.txt', noteText)}
                    disabled={!noteText.trim()}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
                    title={t('call.downloadNotes')}
                  >
                    <Download size={14} />
                  </button>
                </>
              )}
              <button type="button" onClick={() => setNotesOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white md:hidden">
                <X size={14} />
              </button>
            </div>
          </div>
          {sidebarTab === 'translate' ? (
            <TranslatePanel material={sharedMaterial} source={translateSource} target={translateTarget} onAddNote={(line) => setNoteText((text) => (text.trim() ? `${text}\n${line}` : line))} t={t} />
          ) : sidebarTab === 'chat' ? (
            <CallChat messages={chatMessages} onSend={sendChat} myId={user?.id} t={t} />
          ) : (
            <>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t('call.notesPlaceholder')}
                className="flex-1 w-full resize-none bg-transparent p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </>
          )}
        </aside>
      )}

      {reportOpen && (
        <ReportModal sessionId={sessionId} partnerName={otherName || t('call.yourPartner')} getRecording={() => recordingRef.current.done || Promise.resolve(null)} onClose={() => setReportOpen(false)} onSent={leaveAfterReport} t={t} />
      )}

      {ratingOpen && (
        <CallRatingModal
          partnerName={otherName || t('call.yourPartner')}
          onSubmit={submitRating}
          onReport={() => setReportOpen(true)}
          onSummary={downloadSummary}
          t={t}
        />
      )}

      {showCompletedBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6 text-center">
            <p className="text-lg font-semibold text-white mb-2">{t('call.sessionCompletedTitle')}</p>
            <p className="text-sm text-slate-400 mb-6">{t('call.sessionCompletedBody')}</p>
            <button
              onClick={() => { setShowCompletedBox(false); setRatingOpen(true) }}
              className="lp-btn-primary w-full justify-center"
            >
              {t('call.rateAndContinue')}
            </button>
          </div>
        </div>
      )}

      {showLeaveChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6">
            <p className="text-lg font-semibold text-white mb-2">{t('call.leaveChoiceTitle')}</p>
            <p className="text-sm text-slate-400 mb-6">{t('call.leaveChoiceBody')}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => chooseLeaveStatus('completed')} className="lp-btn-primary w-full justify-center">
                {t('call.markComplete')}
              </button>
              <button
                onClick={() => chooseLeaveStatus('not_completed')}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                {t('call.markIncomplete')}
              </button>
              <button
                onClick={() => setShowLeaveChoice(false)}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                {t('call.cancelLeave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
