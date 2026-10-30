import { ArrowLeft, Phone, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import client, { wsUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

// "Today", "Yesterday" or a date, for the dividers between days
function dayLabel(value, locale, t) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return t('conversationThread.today')
  if (date.toDateString() === yesterday.toDateString()) return t('conversationThread.yesterday')
  return date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function ConversationThread({ conversationId, partner, onBack }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const listRef = useRef(null)

  // Same as "Call now": rings the partner and opens a real session (notes, rating, timer).
  const startCall = async () => {
    try {
      const { data } = await client.post('/calls/ring/', { partner_id: partner.id, notify: false })
      navigate(`/call/${data.room_id}?from=${user.id}&name=${encodeURIComponent(user.full_name)}`)
    } catch {
      window.alert(t('call.ringError'))
    }
  }

  useEffect(() => {
    let cancelled = false
    setMessages([])
    client.get(`/chat/conversations/${conversationId}/messages/`).then(({ data }) => {
      if (!cancelled) setMessages(data)
    })

    const socket = new WebSocket(wsUrl(`/ws/chat/${conversationId}/`))
    socketRef.current = socket

    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      setMessages((prev) => [...prev, message])
    }

    return () => {
      cancelled = true
      socket.close()
    }
  }, [conversationId])

  // keep the newest message in view by scrolling the list itself (not the whole page)
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e) => {
    e.preventDefault()
    if (!text.trim() || socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(JSON.stringify({ text }))
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10 md:hidden" style={{ color: 'var(--ink)' }} aria-label={t('messages.back')}>
              <ArrowLeft size={18} className="rtl:rotate-180" />
            </button>
          )}
          {partner && (
            <Link to={`/partners/${partner.id}`} className="shrink-0">
              <img src={avatarUrl(partner.id, 80)} alt="" className="lp-avatar lp-gradient-ring h-10 w-10 object-cover" />
            </Link>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold leading-tight" style={{ color: 'var(--ink)' }}>
              {partner?.full_name || t('conversationThread.conversation')}
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: connected ? '#34d399' : 'var(--ink-soft)' }}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: connected ? '#34d399' : 'var(--ink-soft)', animation: connected ? 'lp-pulse-ring 1.6s ease-out infinite' : undefined }}
              />
              {connected ? t('conversationThread.connected') : t('conversationThread.connecting')}
            </span>
          </div>
        </div>
        {partner && (
          <button type="button" onClick={startCall} className="lp-btn-primary shrink-0 text-sm" style={{ padding: '0.55rem 1.1rem' }}>
            <Phone size={14} /> {t('conversationThread.videoCall')}
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('conversationThread.sayHello')}</p>
        )}
        {messages.map((m, i) => {
          const isMine = m.sender.id === user.id
          const previous = messages[i - 1]
          const newDay = !previous || new Date(previous.created_at).toDateString() !== new Date(m.created_at).toDateString()
          const sameSender = previous && previous.sender.id === m.sender.id && !newDay
          return (
            <div key={m.id}>
              {newDay && (
                <p className="mb-3 mt-4 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>
                  {dayLabel(m.created_at, i18n.resolvedLanguage, t)}
                </p>
              )}
              <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} ${sameSender ? '' : 'mt-3'}`}>
                {!isMine && (
                  <span className="h-7 w-7 shrink-0">
                    {!sameSender && <img src={avatarUrl(m.sender.id, 56)} alt="" className="lp-avatar h-7 w-7 object-cover" />}
                  </span>
                )}
                <div className={`flex max-w-[75%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div
                    className="whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed lp-animate-in-scale"
                    style={
                      isMine
                        ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)', borderEndEndRadius: '6px', boxShadow: '0 8px 20px -12px rgb(20 184 166 / 0.9)' }
                        : { background: 'var(--surface-2)', color: 'var(--ink)', borderEndStartRadius: '6px' }
                    }
                  >
                    {m.text}
                  </div>
                  <span className="mt-1 px-1 text-[10.5px]" style={{ color: 'var(--ink-soft)' }}>
                    {new Date(m.created_at).toLocaleTimeString(i18n.resolvedLanguage, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <form onSubmit={sendMessage} className="flex items-center gap-3 p-3 sm:p-4" style={{ borderTop: '1px solid var(--line)' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('conversationThread.typeAMessage')}
          className="h-12 min-w-0 flex-1 rounded-full px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-40"
          style={{ background: 'var(--gradient-brand)', boxShadow: '0 10px 22px -10px rgb(20 184 166 / 0.9)' }}
          aria-label={t('conversationThread.send')}
        >
          <Send size={18} className="rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  )
}
