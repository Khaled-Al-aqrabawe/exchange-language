import { Phone, PhoneOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
  const [call, setCall] = useState(null)
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
        } catch { /* ignore malformed messages */ }
      }
      socket.onclose = () => { if (!closed) retry = setTimeout(connect, 3000) }
    }
    connect()
    return () => {
      closed = true
      clearTimeout(retry)
      clearTimeout(timer.current)
      socket?.close()
    }
  }, [user?.id])

  if (!call) return null

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
  )
}
