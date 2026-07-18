import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { wsUrl } from '../api/client'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

const statusKeys = {
  connecting: 'call.connecting',
  connected: 'call.connected',
  waiting: 'call.waitingForPartner',
  joined: 'call.partnerJoined',
  ended: 'call.callEnded',
  left: 'call.partnerLeft',
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

  const [status, setStatus] = useState('connecting')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [error, setError] = useState('')

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
    }
  }, [roomId, t])

  const toggleMic = () => {
    const stream = localVideoRef.current?.srcObject
    stream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled))
    setMicOn((v) => !v)
  }

  const toggleCam = () => {
    const stream = localVideoRef.current?.srcObject
    stream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled))
    setCamOn((v) => !v)
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

        {error ? (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/40 px-5 py-4 text-red-300 text-sm">
            {error}
          </div>
        ) : (
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10" style={{ aspectRatio: '16 / 9' }}>
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
              className="absolute bottom-4 end-4 w-40 rounded-xl border-2 border-white/80 shadow-lg"
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={toggleMic}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'
            }`}
            title={micOn ? t('call.mute') : t('call.unmute')}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          <button
            onClick={toggleCam}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              camOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white hover:bg-red-600'
            }`}
            title={camOn ? t('call.turnOffCamera') : t('call.turnOnCamera')}
          >
            {camOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-6 text-white font-medium hover:bg-red-700 transition-colors"
          >
            <PhoneOff size={17} /> {t('call.leave')}
          </button>
        </div>
      </div>
    </div>
  )
}
