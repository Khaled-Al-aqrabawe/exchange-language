import { MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'
import ConversationThread from './ConversationThread'

export default function Messages() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/chat/conversations/')
      .then(({ data }) => setConversations(data))
      .finally(() => setLoading(false))
  }, [])

  const active = conversations.find((c) => String(c.id) === conversationId)
  const partner = active?.participants.find((p) => p.id !== user.id)

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Messages</h1>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex shadow-sm" style={{ height: '65vh' }}>
          <div className="w-72 border-r border-slate-200 overflow-y-auto shrink-0">
            {loading ? (
              <p className="p-4 text-sm text-slate-500">Loading...</p>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-3">
                  <MessageCircle size={17} />
                </div>
                <p className="text-sm text-slate-500">
                  No conversations yet. Message a partner from their profile to get started.
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const other = c.participants.find((p) => p.id !== user.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/messages/${c.id}`)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 flex items-center gap-3 ${
                      String(c.id) === conversationId ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <img
                      src={avatarUrl(other?.id, 60)}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{other?.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {c.last_message?.text || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          <div className="flex-1">
            {active ? (
              <ConversationThread conversationId={active.id} partner={partner} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
