import { Send, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import client, { wsUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

export default function ConversationThread({ conversationId, partner }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    let cancelled = false
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e) => {
    e.preventDefault()
    if (!text.trim() || socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(JSON.stringify({ text }))
    setText('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2.5">
          {partner && (
            <img src={avatarUrl(partner.id, 60)} alt="" className="lp-avatar h-8 w-8 object-cover" />
          )}
          <div>
            <h2 className="font-semibold text-sm leading-tight" style={{ color: 'var(--ink)' }}>{partner?.full_name || t('conversationThread.conversation')}</h2>
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: connected ? 'var(--accent-2)' : 'var(--ink-soft)' }}>
              {connected && <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-2)', animation: 'lp-pulse-ring 1.6s ease-out infinite' }} />}
              {connected ? t('conversationThread.connected') : t('conversationThread.connecting')}
            </span>
          </div>
        </div>
        {partner && (
          <Link
            to={`/call/${[user.id, partner.id].sort((a, b) => a - b).join('-')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            <Video size={15} /> {t('conversationThread.videoCall')}
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m) => {
          const isMine = m.sender.id === user.id
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && (
                <img src={avatarUrl(m.sender.id, 40)} alt="" className="lp-avatar h-6 w-6 object-cover mb-0.5" />
              )}
              <div
                className="max-w-xs px-4 py-2 rounded-2xl text-sm lp-animate-in-scale"
                style={
                  isMine
                    ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)', borderEndEndRadius: '4px' }
                    : { background: 'var(--surface-2)', color: 'var(--ink)', borderEndStartRadius: '4px' }
                }
              >
                {m.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 flex gap-3" style={{ borderTop: '1px solid var(--line)' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('conversationThread.typeAMessage')}
          className="flex-1 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
        />
        <button type="submit" className="lp-btn-primary text-sm">
          <Send size={14} /> {t('conversationThread.send')}
        </button>
      </form>
    </div>
  )
}
