import { MessageCircle, Phone, PhoneOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import client, { wsUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { resolveAvatarUrl } from '../utils/images'

const RING_TIMEOUT_MS = 30000
const POLL_MS = 4000

// Listens on the user's notify socket and shows a box when someone calls them.
export default function IncomingCallBox() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname
  const [call, setCall] = useState(null)
  const [message, setMessage] = useState(null)
  const messageTimer = useRef(null)
  const timer = useRef(null)
  const handled = useRef(new Set())

  const show = (data) => {
    if (handled.current.has(data.room_id)) return
    handled.current.add(data.room_id)
    setCall(data)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCall(null), RING_TIMEOUT_MS)
  }

  // Backup for when the socket can't connect: ask the server for a ringing call.
  useEffect(() => {
    if (!user) return undefined
    const poll = () => client.get('/calls/incoming/').then(({ data }) => { if (data) show(data) }).catch(() => {})
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user) return undefined
    let socket
    let retry
    let closed = false
    const connect = () => {
      socket = new WebSocket(wsUrl('/ws/notify/'))
      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.event === 'incoming-call') show(data)
          if (data.event === 'new-message') {
            // The call page announces its own chat, and an open thread already shows the message.
            const path = pathRef.current
            if (path.startsWith('/call/') || path === `/messages/${data.conversation}`) return
            setMessage(data)
            clearTimeout(messageTimer.current)
            messageTimer.current = setTimeout(() => setMessage(null), 6000)
          }
        } catch { /* ignore malformed messages */ }
      }
      socket.onclose = () => { if (!closed) retry = setTimeout(connect, 3000) }
    }
    connect()
    return () => {
      closed = true
      clearTimeout(retry)
      clearTimeout(timer.current)
      clearTimeout(messageTimer.current)
      socket?.close()
    }
  }, [user?.id])

  const messageToast = message && (
    <button
      type="button"
      onClick={() => { setMessage(null); navigate(`/messages/${message.conversation}`) }}
      className="fixed bottom-4 end-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] items-center gap-3 p-4 text-start lp-surface lp-animate-in-scale"
      style={{ boxShadow: 'var(--shadow-card-hover)' }}
    >
      <span className="lp-icon-badge h-10 w-10 shrink-0"><MessageCircle size={18} /></span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold" style={{ color: 'var(--ink)' }}>{message.sender.name}</span>
        <span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>{message.text}</span>
      </span>
    </button>
  )

  if (!call) return messageToast || null

  const answer = () => {
    clearTimeout(timer.current)
    client.delete('/calls/incoming/').catch(() => {})
    setCall(null)
    navigate(`/call/${call.room_id}?from=${call.caller.id}&name=${encodeURIComponent(call.caller.name)}`)
  }
  const decline = () => {
    clearTimeout(timer.current)
    client.delete('/calls/incoming/').catch(() => {})
    setCall(null)
  }

  return (
    <>
    {messageToast}
    <div
      className="fixed top-20 end-4 z-[70] w-80 p-4 lp-surface lp-animate-in-scale"
      style={{ boxShadow: 'var(--shadow-card-hover)' }}
      role="alertdialog"
    >
      <div className="flex items-center gap-3 mb-3">
        <img src={resolveAvatarUrl(call.caller.avatar, call.caller.id, 96)} alt="" className="lp-avatar h-12 w-12 shrink-0" />
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {t('call.incoming', { name: call.caller.name })}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={answer} className="lp-btn-primary flex-1 justify-center">
          <Phone size={15} /> {t('call.answer')}
        </button>
        <button type="button" onClick={decline} className="lp-btn-secondary flex-1 justify-center">
          <PhoneOff size={15} /> {t('call.decline')}
        </button>
      </div>
    </div>
    </>
  )
}
