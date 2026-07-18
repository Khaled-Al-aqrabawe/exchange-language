import { MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'
import ConversationThread from './ConversationThread'

export default function Messages() {
  const { t } = useTranslation()
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
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight mb-6" style={{ color: 'var(--ink)' }}>{t('messages.title')}</h1>
        <div className="lp-surface overflow-hidden flex" style={{ height: '65vh' }}>
          <div className="w-72 overflow-y-auto shrink-0" style={{ borderInlineEnd: '1px solid var(--line)' }}>
            {loading ? (
              <p className="p-4 text-sm" style={{ color: 'var(--ink-soft)' }}>{t('messages.loading')}</p>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full mx-auto mb-3" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
                  <MessageCircle size={17} />
                </div>
                <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('messages.empty')}</p>
              </div>
            ) : (
              conversations.map((c) => {
                const other = c.participants.find((p) => p.id !== user.id)
                const isActive = String(c.id) === conversationId
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/messages/${c.id}`)}
                    className="w-full text-start px-4 py-3 flex items-center gap-3 hover:opacity-80"
                    style={{ borderBottom: '1px solid var(--line)', background: isActive ? 'var(--surface-2)' : 'transparent' }}
                  >
                    <img src={avatarUrl(other?.id, 60)} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{other?.full_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
                        {c.last_message?.text || t('messages.noMessagesYet')}
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
              <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--ink-soft)' }}>
                {t('messages.selectConversation')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
