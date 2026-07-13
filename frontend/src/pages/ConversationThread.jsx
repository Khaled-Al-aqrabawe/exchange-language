import { Send, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import client, { wsUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

export default function ConversationThread({ conversationId, partner }) {
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
      <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {partner && (
            <img src={avatarUrl(partner.id, 60)} alt="" className="h-8 w-8 rounded-full object-cover" />
          )}
          <div>
            <h2 className="font-semibold text-slate-900 text-sm leading-tight">{partner?.full_name || 'Conversation'}</h2>
            <span className={`text-xs ${connected ? 'text-emerald-600' : 'text-slate-400'}`}>
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
        {partner && (
          <Link
            to={`/call/${[user.id, partner.id].sort((a, b) => a - b).join('-')}`}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700"
          >
            <Video size={15} /> Video call
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m) => {
          const isMine = m.sender.id === user.id
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && (
                <img src={avatarUrl(m.sender.id, 40)} alt="" className="h-6 w-6 rounded-full object-cover mb-0.5" />
              )}
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-slate-900 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-800 rounded-bl-md'
                }`}
              >
                {m.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-slate-200 p-4 flex gap-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  )
}
