import { BookOpen, MessageCircle, MessagesSquare, Mic, MicOff, PhoneOff, Send, Users, Video, VideoOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import client, { wsUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { resolveAvatarUrl } from '../utils/images'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

// One person's picture. A face placeholder shows until video arrives or while the camera is off.
function Tile({ stream, name, avatar, id, muted = false, mic = true, cam = true }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream || null
  }, [stream])
  const showVideo = !!stream && cam
  return (
    <div className="relative min-h-0 overflow-hidden rounded-2xl bg-slate-800">
      <video ref={ref} autoPlay playsInline muted={muted} className={`h-full w-full object-cover ${showVideo ? '' : 'invisible'}`} />
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={resolveAvatarUrl(avatar, id, 160)} alt="" className="lp-avatar h-24 w-24 object-cover opacity-90" />
        </div>
      )}
      <span className="absolute bottom-2 start-2 inline-flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-0.5 text-[12px] font-medium text-white backdrop-blur">
        {!mic && <MicOff size={12} className="text-rose-300" />}
        {name}
      </span>
    </div>
  )
}

// A call for up to 4 people: everyone is connected to everyone (a mesh); the server only
// passes the connection messages along, never the video.
export default function GroupCall() {
  const { t } = useTranslation()
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [gate, setGate] = useState('checking') // checking | wait | ok
  const [error, setError] = useState('')
  const [peers, setPeers] = useState({}) // id -> { id, name, avatar, stream, mic, cam }
  const [localStream, setLocalStream] = useState(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [chat, setChat] = useState([])
  const [text, setText] = useState('')
  const [unread, setUnread] = useState(0)

  const socketRef = useRef(null)
  const pcsRef = useRef({})
  const pendingRef = useRef({})
  const streamRef = useRef(null)
  const stateRef = useRef({ mic: true, cam: true })
  const chatOpenRef = useRef(false)
  const leavingRef = useRef(false)
  chatOpenRef.current = chatOpen

  const send = (payload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(payload))
  }

  const sendState = () => send({ type: 'media-state', mic: stateRef.current.mic, cam: stateRef.current.cam })

  const upsertPeer = (id, patch) => setPeers((p) => ({ ...p, [id]: { id, mic: true, cam: true, ...p[id], ...patch } }))

  const closePeer = (id) => {
    pcsRef.current[id]?.close()
    delete pcsRef.current[id]
    delete pendingRef.current[id]
    setPeers((p) => {
      const { [id]: _gone, ...rest } = p
      return rest
    })
  }

  const createPc = (id) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    streamRef.current?.getTracks().forEach((track) => pc.addTrack(track, streamRef.current))
    pc.onicecandidate = (e) => { if (e.candidate) send({ to: id, type: 'ice', candidate: e.candidate }) }
    pc.ontrack = (e) => upsertPeer(id, { stream: e.streams[0] })
    pcsRef.current[id] = pc
    return pc
  }

  const flushCandidates = async (id, pc) => {
    for (const c of pendingRef.current[id] || []) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
    pendingRef.current[id] = []
  }

  const cleanup = () => {
    socketRef.current?.close()
    Object.values(pcsRef.current).forEach((pc) => pc.close())
    pcsRef.current = {}
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  // The group is scheduled: reserve a seat if needed, then wait for the start time.
  useEffect(() => {
    let cancelled = false
    let timer
    async function check() {
      try {
        let { data } = await client.get(`/calls/groups/${roomId}/`)
        if (data.cancelled) throw Object.assign(new Error('gone'), { response: { status: 404 } })
        if (!data.is_member) ({ data } = await client.post(`/calls/groups/${roomId}/join/`))
        if (cancelled) return
        setGroup(data)
        if (data.can_enter) setGate('ok')
        else { setGate('wait'); timer = setTimeout(check, 10000) }
      } catch (err) {
        if (cancelled) return
        setError(err.response?.status === 404
          ? t('group.ended', 'This group has ended.')
          : (err.response?.data?.detail || t('group.joinError', 'Could not join the group.')))
      }
    }
    check()
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  useEffect(() => {
    if (gate !== 'ok') return undefined
    let cancelled = false

    async function start() {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stateRef.current.cam = false
          setCamOn(false)
        } catch {
          setError(t('call.micError'))
          return
        }
      }
      if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return }
      streamRef.current = stream
      setLocalStream(stream)

      const socket = new WebSocket(wsUrl(`/ws/group/${roomId}/`))
      socketRef.current = socket
      socket.onmessage = async (event) => {
        if (cancelled) return
        const data = JSON.parse(event.data)
        const from = data.from

        if (data.event === 'peers') {
          // I am the newcomer: I call everyone who is already here
          for (const p of data.peers) {
            upsertPeer(p.id, { name: p.name })
            const pc = createPc(p.id)
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            send({ to: p.id, type: 'offer', sdp: offer })
          }
          sendState()
        } else if (data.event === 'peer-joined') {
          upsertPeer(data.peer.id, { name: data.peer.name })
          sendState()
        } else if (data.event === 'peer-left') {
          closePeer(data.peer.id)
        } else if (data.type === 'offer') {
          // someone who refreshed calls me again: start over with a fresh connection
          let pc = pcsRef.current[from]
          if (pc?.remoteDescription) { pc.close(); delete pcsRef.current[from]; pc = null }
          pc = pc || createPc(from)
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          await flushCandidates(from, pc)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          send({ to: from, type: 'answer', sdp: answer })
        } else if (data.type === 'answer') {
          const pc = pcsRef.current[from]
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
            await flushCandidates(from, pc)
          }
        } else if (data.type === 'ice' && data.candidate) {
          const pc = pcsRef.current[from]
          if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {})
          else (pendingRef.current[from] = pendingRef.current[from] || []).push(data.candidate)
        } else if (data.type === 'media-state') {
          upsertPeer(from, { mic: data.mic, cam: data.cam })
        } else if (data.type === 'chat') {
          setChat((list) => [...list, { from, name: data.name, text: data.text }])
          if (!chatOpenRef.current) setUnread((n) => n + 1)
        }
      }
      socket.onclose = () => {
        if (!cancelled && !leavingRef.current) setError(t('group.disconnected', 'You were disconnected from the group.'))
      }
    }

    start()
    return () => {
      cancelled = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, gate])

  const toggleMic = () => {
    const next = !micOn
    streamRef.current?.getAudioTracks().forEach((tr) => { tr.enabled = next })
    stateRef.current.mic = next
    setMicOn(next)
    sendState()
  }

  const toggleCam = () => {
    if (!streamRef.current?.getVideoTracks().length) return
    const next = !camOn
    streamRef.current.getVideoTracks().forEach((tr) => { tr.enabled = next })
    stateRef.current.cam = next
    setCamOn(next)
    sendState()
  }

  const leave = () => {
    leavingRef.current = true
    cleanup()
    navigate('/partners', { replace: true })
  }

  const sendChat = (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    send({ type: 'chat', text: value })
    setChat((list) => [...list, { from: user.id, name: t('group.you', 'You'), text: value }])
    setText('')
  }

  const others = Object.values(peers)
  const total = others.length + 1
  // 1 person: full screen. 2: side by side. 3-4: the screen is divided into four.
  const cols = total <= 1 ? 'grid-cols-1' : 'grid-cols-2'

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 px-6">
        <div className="max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
          <p className="mb-5 text-white">{error}</p>
          <button type="button" onClick={() => navigate('/partners', { replace: true })} className="lp-btn-primary w-full justify-center">
            {t('call.backToPartners', 'Back to partners')}
          </button>
        </div>
      </div>
    )
  }

  if (gate !== 'ok') {
    const when = group ? new Date(group.scheduled_time) : null
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 px-6">
        <div className="max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
          <Users size={30} className="mx-auto mb-3 text-teal-300" />
          <p className="lp-serif text-xl" style={{ color: '#fff' }}>{t('group.seatReserved', 'Your seat is reserved')}</p>
          {when && (
            <p className="mt-2 text-sm text-slate-300">
              {t('group.startsAt', 'The group starts {{when}}. You can enter 10 minutes before.', {
                when: when.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
              })}
            </p>
          )}
          <button type="button" onClick={() => navigate('/partners', { replace: true })} className="lp-btn-primary mt-5 w-full justify-center">
            {t('call.backToPartners', 'Back to partners')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-950 md:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-3">
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-3">
            <h1 className="lp-serif text-xl" style={{ color: '#fff' }}>{t('group.title', 'Small group')}</h1>
            {group && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                {group.session_type === 'conversation' ? <MessagesSquare size={13} /> : <BookOpen size={13} />}
                {group.session_type === 'conversation'
                  ? t('partners.typeConversation', 'Free conversation')
                  : `${t('partners.typeLesson', 'From the lessons')}${group.lesson ? ` · ${t('partners.lessonOption', { n: group.lesson })}` : ''}`}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-300"><Users size={15} /> {total}/4</span>
        </div>

        <div className={`grid min-h-0 flex-1 gap-3 ${cols} ${total > 2 ? 'grid-rows-2' : ''}`}>
          <Tile stream={localStream} name={t('group.you', 'You')} avatar={user?.profile?.avatar} id={user?.id} muted mic={micOn} cam={camOn} />
          {others.map((p) => (
            <Tile key={p.id} stream={p.stream} name={p.name || '…'} avatar={p.avatar} id={p.id} mic={p.mic} cam={p.cam} />
          ))}
        </div>
        {others.length === 0 && (
          <p className="mt-3 text-center text-sm text-slate-400">{t('group.waiting', 'Waiting for others to join… They can find this group on the Partners page.')}</p>
        )}

        <div className="mt-3 flex shrink-0 items-center justify-center gap-3">
          <button type="button" onClick={toggleMic} className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${micOn ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-600'}`} aria-label="Microphone">
            {micOn ? <Mic size={19} /> : <MicOff size={19} />}
          </button>
          <button type="button" onClick={toggleCam} className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${camOn ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-600'}`} aria-label="Camera">
            {camOn ? <Video size={19} /> : <VideoOff size={19} />}
          </button>
          <button
            type="button"
            onClick={() => { setChatOpen((o) => !o); setUnread(0) }}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label={t('group.chat', 'Chat')}
          >
            <MessageCircle size={19} />
            {unread > 0 && <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">{unread}</span>}
          </button>
          <button type="button" onClick={leave} className="inline-flex h-12 items-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-semibold text-white hover:bg-rose-500">
            <PhoneOff size={18} /> {t('group.leave', 'Leave')}
          </button>
        </div>
      </div>

      {chatOpen && (
        <aside className="flex h-72 shrink-0 flex-col border-t border-white/10 bg-slate-900 md:h-auto md:w-80 md:border-s md:border-t-0">
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {chat.length === 0 && <p className="pt-6 text-center text-sm text-slate-500">{t('conversationThread.sayHello')}</p>}
            {chat.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.from === user?.id ? 'items-end' : 'items-start'}`}>
                <span className="px-1 text-[11px] text-slate-400">{m.name}</span>
                <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${m.from === user?.id ? 'bg-teal-300 text-slate-900' : 'bg-white/10 text-white'}`}>{m.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} className="flex items-center gap-2 border-t border-white/10 p-3">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('conversationThread.typeAMessage')} className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-white/10 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
            <button type="submit" disabled={!text.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-300 text-slate-900 disabled:opacity-40" aria-label={t('conversationThread.send')}>
              <Send size={16} />
            </button>
          </form>
        </aside>
      )}
    </div>
  )
}
