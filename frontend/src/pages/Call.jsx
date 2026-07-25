import { Download, ExternalLink, FileText, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import client, { wsUrl } from '../api/client'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

const statusKeys = {
  connecting: 'call.connecting',
  connected: 'call.connected',
  waiting: 'call.waitingForPartner',
  joined: 'call.partnerJoined',
  ended: 'call.callEnded',
  left: 'call.partnerLeft',
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']

function SharedMaterialStage({ material, onClose, t }) {
  const name = material.file_name || material.title
  const ext = name.split('.').pop()?.toLowerCase()
  const isImage = IMAGE_EXTENSIONS.includes(ext)
  const isPdf = ext === 'pdf'
  const isTextLike = ['txt', 'md', 'csv'].includes(ext)
  const canEmbed = isImage || isPdf || isTextLike

  return (
    <div
      className="relative mt-4 bg-slate-900 rounded-2xl overflow-hidden lp-animate-in-scale"
      style={{ boxShadow: '0 24px 64px -20px rgb(0 0 0 / 0.6)', border: '1px solid rgb(255 255 255 / 0.1)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.1)' }}>
        <span className="inline-flex items-center gap-2 min-w-0 text-sm text-white">
          <FileText size={15} className="shrink-0 text-slate-400" />
          <span className="truncate">
            <span className="text-slate-400">{t(material.from === 'you' ? 'materials.sharedByYou' : 'materials.sharedByPartner')}: </span>
            {material.title}
          </span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={material.file}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            title={t('materials.openFile')}
          >
            <ExternalLink size={15} />
          </a>
          <a
            href={material.file}
            download
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            title={t('materials.download')}
          >
            <Download size={15} />
          </a>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            title={t('materials.stopSharing')}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {canEmbed ? (
        isImage ? (
          <img src={material.file} alt={material.title} className="w-full max-h-[480px] object-contain bg-black" />
        ) : (
          <iframe src={material.file} title={material.title} className="w-full h-[480px] bg-white" />
        )
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
          <FileText size={32} />
          <p className="text-sm">{name}</p>
        </div>
      )}
    </div>
  )
}

export default function Call() {
  const { t } = useTranslation()
  const { roomId } = useParams()
  const navigate = useNavigate()

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const pcRef = useRef(null)
  const socketRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const cameraStreamRef = useRef(null)
  const screenStreamRef = useRef(null)

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
        setSessionEndTime(endTime)
      })
      .catch(() => {})
  }, [roomId])

  useEffect(() => {
    let cancelled = false
    let localStream

    async function start() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
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
  }, [roomId, t])

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

  const handleLeaveClick = () => {
    if (sessionEndTime && Date.now() < sessionEndTime && !autoEndedRef.current) {
      setShowLeaveChoice(true)
      return
    }
    navigate(-1)
  }

  const chooseLeaveStatus = (statusValue) => {
    setSessionStatus(statusValue)
    setShowLeaveChoice(false)
    cleanupMedia()
    navigate(-1)
  }

  const toggleMic = () => {
    cameraStreamRef.current?.getAudioTracks().forEach((tr) => (tr.enabled = !tr.enabled))
    setMicOn((v) => !v)
  }

  const toggleCam = () => {
    cameraStreamRef.current?.getVideoTracks().forEach((tr) => (tr.enabled = !tr.enabled))
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

  const openMaterialPicker = () => {
    setShowMaterialPicker(true)
    if (materials.length === 0) {
      setMaterialsLoading(true)
      client.get('/courses/materials/')
        .then(({ data }) => setMaterials(data))
        .finally(() => setMaterialsLoading(false))
    }
  }

  const shareMaterial = (m) => {
    const material = { id: m.id, title: m.title, file: m.file, file_name: m.file_name }
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

  const isConnected = status === 'connected'
  const statusText = t(statusKeys[status] || statusKeys.connecting)

  return (
    <div className="bg-slate-950 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-white">{t('call.title')}</h1>
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
            className="relative bg-slate-900 rounded-2xl overflow-hidden lp-animate-in-scale"
            style={{ aspectRatio: '16 / 9', boxShadow: '0 24px 64px -20px rgb(0 0 0 / 0.6)', border: '1px solid rgb(255 255 255 / 0.1)' }}
          >
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                {statusText}
              </div>
            )}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 end-4 w-40 rounded-xl shadow-lg transition-transform hover:scale-105"
              style={{ border: '2px solid var(--accent-2)' }}
            />
          </div>
        )}

        {sharedMaterial && <SharedMaterialStage material={sharedMaterial} onClose={closeSharedMaterial} t={t} />}

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
