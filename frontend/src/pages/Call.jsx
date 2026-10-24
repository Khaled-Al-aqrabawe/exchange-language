import { Check, Clock, FileText, Maximize, Mic, MicOff, Minimize, MonitorUp, PhoneOff, Video, VideoOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import client, { wsUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'

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

function formatClock(totalSeconds) {
  const secs = Math.max(0, totalSeconds)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
const OFFICE_EXTENSIONS = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx']

function SharedMaterialStage({ material, onClose, onFinish, t }) {
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
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(material.file)}${material.start_slide > 1 ? `&wdStartOn=${material.start_slide}` : ''}`
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
  const pcRef = useRef(null)
  const socketRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const cameraStreamRef = useRef(null)
  const previewStreamRef = useRef(null)
  const lobbyVideoRef = useRef(null)
  const screenStreamRef = useRef(null)

  const [joined, setJoined] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const [status, setStatus] = useState('connecting')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
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
  const [liveStart, setLiveStart] = useState(null)
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
        setRequester((r) => r || { id: session.host.id, name: session.host.full_name })
        setSessionEndTime(endTime)
      })
      .catch(() => {})
  }, [roomId])

  // Lobby: preview the camera so the user can set mic/camera before joining.
  useEffect(() => {
    if (joined) return undefined
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        previewStreamRef.current = stream
        if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = stream
        setPreviewReady(true)
      })
      .catch(() => {
        if (!cancelled) setError(t('call.micError'))
      })
    return () => { cancelled = true }
  }, [joined, t])

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

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]
        setStatus('connected')
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send({ type: 'ice-candidate', candidate: event.candidate })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setStatus('connected')
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          setStatus('ended')
        }
      }

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
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          send({ type: 'offer', sdp: offer })
        } else if (data.type === 'offer') {
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
        } else if (data.type === 'live-start') {
          setLiveStart((v) => v || Date.now())
        } else if (data.type === 'material-share-stop') {
          setSharedMaterial(null)
        } else if (data.event === 'peer-left') {
          setStatus('left')
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
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
    if (!sessionId) return
    client.patch(`/sessions/${sessionId}/status/`, { status: statusValue }).catch(() => {})
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
  const leaveCall = () => {
    cleanupMedia()
    navigate(sessionId ? '/schedule' : '/partners', { replace: true })
  }

  const handleLeaveClick = () => {
    if (sessionEndTime && Date.now() < sessionEndTime && !autoEndedRef.current) {
      setShowLeaveChoice(true)
      return
    }
    leaveCall()
  }

  const chooseLeaveStatus = (statusValue) => {
    setSessionStatus(statusValue)
    setShowLeaveChoice(false)
    leaveCall()
  }

  const toggleMic = () => {
    const stream = cameraStreamRef.current || previewStreamRef.current
    stream?.getAudioTracks().forEach((tr) => (tr.enabled = !tr.enabled))
    setMicOn((v) => !v)
  }

  const toggleCam = () => {
    const stream = cameraStreamRef.current || previewStreamRef.current
    stream?.getVideoTracks().forEach((tr) => (tr.enabled = !tr.enabled))
    setCamOn((v) => !v)
  }

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
    setSharedMaterial({ ...material, from: 'you' })
    setShowMaterialPicker(false)
  }

  const closeSharedMaterial = () => {
    if (sharedMaterial?.from === 'you') {
      send({ type: 'material-share-stop' })
    }
    setSharedMaterial(null)
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
              {!previewReady && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">{t('call.connecting')}</div>
              )}
              {previewReady && !camOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400">
                  <VideoOff size={32} />
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={toggleMic}
              disabled={!previewReady}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 disabled:opacity-40 ${
                micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'
              }`}
              title={micOn ? t('call.mute') : t('call.unmute')}
            >
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              onClick={toggleCam}
              disabled={!previewReady}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 disabled:opacity-40 ${
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
              disabled={!previewReady}
              className="lp-btn-primary disabled:opacity-50"
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
      <div className="max-w-4xl mx-auto px-6 py-10">
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
            style={{ aspectRatio: '16 / 9', boxShadow: '0 24px 64px -20px rgb(0 0 0 / 0.6)', border: '1px solid rgb(255 255 255 / 0.1)' }}
          >
            {/* While a file is shared it covers the stage, so the other user shrinks into a box above yours. */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={sharedMaterial
                ? 'absolute bottom-[10rem] end-4 w-40 aspect-[4/3] object-cover rounded-xl shadow-lg z-20'
                : 'w-full h-full object-cover'}
              style={sharedMaterial ? { border: '2px solid var(--accent)' } : undefined}
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
                t={t}
              />
            )}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute bottom-4 end-4 w-40 rounded-xl shadow-lg transition-transform hover:scale-105 z-20 ${screenSharing ? 'hidden' : ''}`}
              style={{ border: '2px solid var(--accent-2)' }}
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

      {showCompletedBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6 text-center">
            <p className="text-lg font-semibold text-white mb-2">{t('call.sessionCompletedTitle')}</p>
            <p className="text-sm text-slate-400 mb-6">{t('call.sessionCompletedBody')}</p>
            <button
              onClick={() => navigate('/schedule')}
              className="lp-btn-primary w-full justify-center"
            >
              {t('call.backToSchedule')}
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
