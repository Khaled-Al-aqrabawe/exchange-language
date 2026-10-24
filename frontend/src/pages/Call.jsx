import { Check, Clock, Download, Eraser, FileText, Flag, NotebookPen, Pen, Send, Star, Type, Maximize, Mic, MicOff, Minimize, MonitorUp, PhoneOff, Video, VideoOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import client, { wsUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { downloadFile, downloadText } from '../utils/downloadFile'

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
function AnnotationLayer({ active, tool, color, strokes, onDraw }) {
  const canvasRef = useRef(null)
  const current = useRef(null)
  const [textAt, setTextAt] = useState(null)
  const [textValue, setTextValue] = useState('')

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
    strokes.forEach((stroke) => {
      if (stroke.type === 'text') {
        ctx.fillStyle = stroke.color
        ctx.font = `600 ${stroke.size * height}px sans-serif`
        ctx.textBaseline = 'middle'
        ctx.fillText(stroke.text, stroke.x * width, stroke.y * height)
        return
      }
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.w
      ctx.beginPath()
      stroke.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * width, y * height) : ctx.moveTo(x * width, y * height)))
      if (stroke.pts.length === 1) ctx.lineTo(stroke.pts[0][0] * width + 0.1, stroke.pts[0][1] * height)
      ctx.stroke()
    })
  }

  useEffect(() => {
    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [strokes])

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]
  }

  const flush = () => {
    const c = current.current
    if (!c || !c.pending.length) return
    onDraw({ id: c.id, color: c.color, w: c.w, pts: c.pending })
    c.pending = []
    c.last = performance.now()
  }

  const commitText = () => {
    const value = textValue.trim()
    if (value && textAt) {
      onDraw({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'text', x: textAt[0], y: textAt[1], text: value, color, size: 0.04 })
    }
    setTextAt(null)
    setTextValue('')
  }

  const onPointerDown = (e) => {
    if (tool === 'text') {
      e.preventDefault()
      commitText()
      setTextAt(point(e))
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    current.current = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, color, w: 3, last: 0, pending: [point(e)] }
    flush()
  }
  const onPointerMove = (e) => {
    const c = current.current
    if (!c) return
    c.pending.push(point(e))
    if (performance.now() - c.last > 40) flush()
  }
  const onPointerUp = () => {
    flush()
    current.current = null
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full z-[6]"
        style={{ pointerEvents: active ? 'auto' : 'none', cursor: tool === 'text' ? 'text' : 'crosshair', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {active && tool === 'text' && textAt && (
        <input
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText()
            if (e.key === 'Escape') { setTextAt(null); setTextValue('') }
          }}
          onBlur={commitText}
          className="absolute z-[7] w-52 rounded-md bg-black/70 px-2 py-1 text-sm text-white focus:outline-none"
          style={{ left: `${textAt[0] * 100}%`, top: `${textAt[1] * 100}%`, transform: 'translateY(-50%)', border: `2px solid ${color}` }}
        />
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
      {pen.strokes.length > 0 && (
        <button
          type="button"
          onClick={pen.onClear}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          title={t('call.clearDrawing')}
        >
          <Eraser size={14} />
        </button>
      )}
    </>
  )
}

function SharedMaterialStage({ material, onClose, onFinish, pen, t }) {
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
    <div className="absolute inset-0 z-10 flex flex-col bg-slate-900 lp-animate-in-scale">
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
            <iframe src={embedSrc} title={material.title} className="w-full h-full bg-white border-0" />
          )
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 h-full text-slate-400">
            <FileText size={32} />
            <p className="text-sm">{name}</p>
          </div>
        )}
        <AnnotationLayer active={pen.on} tool={pen.tool} color={pen.color} strokes={pen.strokes} onDraw={pen.onDraw} />
      </div>
    </div>
  )
}

const REPORT_REASONS = [
  'harassment', 'inappropriate_content', 'no_show', 'late_or_left_early', 'off_topic', 'technical', 'fake_profile', 'spam', 'other',
]

// Report a problem with the other person; the admin receives it with the chosen reason.
function ReportModal({ sessionId, partnerName, onClose, t }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

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
      await client.post(`/sessions/${sessionId}/report/`, { reason, details })
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
            <button onClick={onClose} className="lp-btn-primary w-full justify-center">{t('common.close')}</button>
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
                {busy ? t('schedule.submitting') : t('report.send')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Shown when leaving a session (completed or not) so each person can rate the other.
function CallRatingModal({ partnerName, files, notes, onSubmit, onSkip, onReport, t }) {
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
    setSubmitting(true)
    await onSubmit(score, comment.trim())
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6">
        <p className="text-lg font-semibold text-white mb-1">{t('schedule.rateModalTitle', { name: partnerName })}</p>
        <p className="text-sm text-slate-400 mb-4">{t('schedule.rateModalSubtitle')}</p>
        {(files.length > 0 || notes.trim()) && (
          <div className="mb-4 rounded-xl bg-white/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{t('call.downloadsTitle')}</p>
            <div className="flex flex-col gap-1.5">
              {notes.trim() && (
                <button
                  type="button"
                  onClick={() => downloadText('session-notes.txt', notes)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-sm text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <Download size={14} className="shrink-0 text-slate-400" /> <span className="truncate">{t('call.downloadNotes')}</span>
                </button>
              )}
              {files.map((f) => (
                <button
                  key={f.file}
                  type="button"
                  onClick={() => downloadFile(f.file, f.file_name)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-sm text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <Download size={14} className="shrink-0 text-slate-400" /> <span className="truncate">{f.title}</span>
                </button>
              ))}
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
          placeholder={t('schedule.rateCommentPlaceholder')}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        {error && <p className="text-sm mt-2" style={{ color: '#f87171' }}>{error}</p>}
        <div className="flex items-center justify-between gap-2 mt-5">
          <button type="button" onClick={onReport} className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80" style={{ color: '#f87171' }}>
            <Flag size={14} /> {t('report.link')}
          </button>
          <div className="flex gap-2">
          <button onClick={onSkip} disabled={submitting} className="text-sm px-4 py-2 rounded-lg font-medium text-slate-400 hover:text-white transition-colors">
            {t('call.skipRating')}
          </button>
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
  const { t } = useTranslation()
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const stageRef = useRef(null)
  const localDrag = useDraggable(stageRef)
  const remoteDrag = useDraggable(stageRef)
  const pcRef = useRef(null)
  const socketRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const cameraStreamRef = useRef(null)
  const previewStreamRef = useRef(null)
  const joinedRef = useRef(false)
  const micOnRef = useRef(!!saved?.mic)
  const camOnRef = useRef(!!saved?.cam)
  const lobbyVideoRef = useRef(null)
  const screenStreamRef = useRef(null)

  const [saved] = useState(() => readCallState(roomId))
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
  const [reportOpen, setReportOpen] = useState(false)
  const [adminNoteState, setAdminNoteState] = useState('idle')
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
        setOtherName((session.host.id === user?.id ? session.partner : session.host).full_name)
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
        } else if (data.type === 'screen-state') {
          setRemoteSharing(!!data.on)
          if (!data.on) setStrokes([])
        } else if (data.type === 'cam-state') {
          setRemoteCamOn(!!data.on)
        } else if (data.type === 'draw' && data.chunk) {
          addStrokeChunk(data.chunk)
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
  const exitCall = () => {
    writeCallState(roomId, null)
    navigate(sessionId ? '/schedule' : '/partners', { replace: true })
  }

  // Leaving always ends with the chance to rate the other person (when there is a session).
  const leaveCall = () => {
    if (noteLoadedRef.current) saveNote(noteTextRef.current)
    cleanupMedia()
    if (sessionId) setRatingOpen(true)
    else exitCall()
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
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      stageRef.current?.requestFullscreen().catch(() => {})
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
    const material = { id: m.id, title: m.title, file: m.file, file_name: m.file_name, start_slide: startSlide }
    send({ type: 'material-share', material })
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

  const sendNoteToAdmin = async () => {
    setAdminNoteState('sending')
    try {
      await client.post(`/sessions/${sessionId}/report/`, { reason: 'note_to_admin', details: noteTextRef.current })
      setAdminNoteState('sent')
    } catch {
      setAdminNoteState('error')
    }
  }

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
  const isMyTurn = liveTurn === 0 ? iAmRequester : !iAmRequester
  const liveActive = !!liveStart && !!requester && !liveEnded
  const turnCountdown = liveActive && turnRemaining > 0 && turnRemaining <= 60 && countdownValue == null ? turnRemaining : null

  const askFinished = (material, reason) => {
    setStoppedSlide('')
    setPromptError('')
    setFinishPrompt({ material, reason, step: 'ask' })
  }

  // Note of who sent the request, shown when the session starts.
  useEffect(() => {
    if (!liveStart || !requester) return undefined
    setStartNote(iAmRequester ? t('call.youStartedNote') : t('call.requestedByNote', { name: requester.name || t('call.yourPartner') }))
    const id = setTimeout(() => setStartNote(''), 10000)
    return () => clearTimeout(id)
  }, [liveStart, requester?.id])

  // A turn begins: its owner opens their next lesson; the previous owner is asked how it went.
  useEffect(() => {
    if (!liveStart || !requester) return
    const key = `turn-${liveTurn}`
    if (firedRef.current.has(key)) return
    firedRef.current.add(key)
    const prev = sharedRef.current
    if (liveTurn === 1 && !isMyTurn && prev?.from === 'you' && prev.id) askFinished(prev, 'turn')
    if (isMyTurn) shareNextLesson()
  }, [liveStart, liveTurn, requester?.id])

  // Toasts at 10 and 20 minutes into each turn, and the end of the session.
  useEffect(() => {
    if (!liveStart || !requester) return
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
    if (statusValue === 'partial') body.last_slide = Number(stoppedSlide)
    try {
      await client.post('/courses/progress/', body)
    } catch {
      setPromptError(t('call.progressError'))
      return
    }
    setFinishPrompt(null)
    if (statusValue === 'complete' && reason === 'next') shareNextLesson()
  }

  // Tell the other side whenever our camera turns on/off (and once the call connects).
  useEffect(() => {
    if (joined && status === 'connected') send({ type: 'cam-state', on: camOn })
  }, [joined, status, camOn])

  useEffect(() => {
    if (joined && status === 'connected') send({ type: 'screen-state', on: screenSharing })
    if (!screenSharing) setStrokes((list) => (list.length && !sharedRef.current ? [] : list))
  }, [joined, status, screenSharing])

  const drawLocal = (chunk) => {
    addStrokeChunk(chunk)
    send({ type: 'draw', chunk })
  }

  const clearDrawing = () => {
    setStrokes([])
    send({ type: 'draw-clear' })
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
    onClear: clearDrawing,
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
          <p className="text-sm text-slate-400 mb-6">{t('call.joinHint')}</p>
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
    <div className="bg-slate-950 min-h-[calc(100vh-4rem)]">
      <div className={`${sharedMaterial ? 'max-w-[1400px]' : 'max-w-4xl'} mx-auto px-6 py-10 transition-[max-width] duration-300`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold text-white">{t('call.title')}</h1>
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
            style={{ aspectRatio: sharedMaterial ? '16 / 10' : '16 / 9', boxShadow: '0 24px 64px -20px rgb(0 0 0 / 0.6)', border: '1px solid rgb(255 255 255 / 0.1)' }}
          >
            {/* While a file is shared it covers the stage, so the other user shrinks into a box above yours. */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={sharedMaterial
                ? `absolute bottom-[12rem] end-4 w-40 aspect-[4/3] object-cover rounded-xl shadow-lg z-20 ${remoteCamOn ? '' : 'hidden'}`
                : 'w-full h-full object-cover'}
              style={sharedMaterial ? { border: '2px solid var(--accent)', ...remoteDrag.style } : undefined}
              {...(sharedMaterial ? remoteDrag.handlers : {})}
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
                t={t}
              />
            )}
            {screenAnnotating && (
              <>
                <AnnotationLayer active={penOn} tool={penTool} color={penColor} strokes={strokes} onDraw={drawLocal} />
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
              className={`absolute ${sharedMaterial ? 'bottom-14' : 'bottom-4'} end-4 w-40 rounded-xl shadow-lg z-20 ${screenSharing || !camOn ? 'hidden' : ''}`}
              style={{ border: '2px solid var(--accent-2)', ...localDrag.style }}
              {...localDrag.handlers}
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
            onClick={toggleScreenShare}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 ${
              screenSharing ? 'bg-[var(--accent)] text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={screenSharing ? t('call.stopSharingScreen') : t('call.shareScreen')}
          >
            <MonitorUp size={18} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:scale-105"
            title={isFullscreen ? t('call.exitFullscreen') : t('call.fullscreen')}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          <button
            onClick={openMaterialPicker}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:scale-105"
            title={t('materials.shareInCall')}
          >
            <FileText size={18} />
          </button>
          {sessionId && (
            <button
              onClick={() => setReportOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:scale-105"
              title={t('report.link')}
            >
              <Flag size={18} />
            </button>
          )}
          <button
            onClick={() => setNotesOpen((v) => !v)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 ${
              notesOpen ? 'bg-[var(--accent)] text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={t('call.notes')}
          >
            <NotebookPen size={18} />
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
            {finishPrompt.step === 'ask' ? (
              <div className="flex flex-col gap-2">
                <button onClick={() => answerFinished('complete')} className="lp-btn-primary w-full justify-center">
                  {t('call.finishedYes')}
                </button>
                <button
                  onClick={() => setFinishPrompt({ ...finishPrompt, step: 'slide' })}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {t('call.finishedNo')}
                </button>
                <button
                  onClick={() => answerFinished('not_started')}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  {t('call.finishedNone')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="text-sm text-slate-300">{t('call.stoppedAtLabel')}</label>
                <input
                  type="number"
                  min="1"
                  autoFocus
                  value={stoppedSlide}
                  onChange={(e) => setStoppedSlide(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <button
                  onClick={() => answerFinished('partial')}
                  disabled={!(Number(stoppedSlide) >= 1)}
                  className="lp-btn-primary w-full justify-center disabled:opacity-50"
                >
                  {t('call.stoppedAtSave')}
                </button>
              </div>
            )}
            {promptError && <p className="text-sm mt-3" style={{ color: '#f87171' }}>{promptError}</p>}
          </div>
        </div>
      )}

      {notesOpen && (
        <aside className="fixed top-16 bottom-0 end-0 z-40 w-80 max-w-full flex flex-col bg-slate-900 border-s border-white/10 lp-animate-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <NotebookPen size={15} /> {t('call.notes')}
            </span>
            <div className="flex items-center gap-2">
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
              <button type="button" onClick={() => setNotesOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white">
                <X size={14} />
              </button>
            </div>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t('call.notesPlaceholder')}
            className="flex-1 w-full resize-none bg-transparent p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {sessionId && (
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/10">
              <span className="text-xs text-slate-400">
                {adminNoteState === 'sent' ? t('call.sentToAdmin') : adminNoteState === 'error' ? t('call.notesError') : ''}
              </span>
              <button
                type="button"
                onClick={sendNoteToAdmin}
                disabled={!noteText.trim() || adminNoteState === 'sending'}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 h-8 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-40 transition-colors"
              >
                <Send size={13} /> {t('call.sendToAdmin')}
              </button>
            </div>
          )}
        </aside>
      )}

      {reportOpen && (
        <ReportModal sessionId={sessionId} partnerName={otherName || t('call.yourPartner')} onClose={() => setReportOpen(false)} t={t} />
      )}

      {ratingOpen && (
        <CallRatingModal
          partnerName={otherName || t('call.yourPartner')}
          files={sharedFiles}
          notes={noteText}
          onSubmit={submitRating}
          onSkip={exitCall}
          onReport={() => setReportOpen(true)}
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
