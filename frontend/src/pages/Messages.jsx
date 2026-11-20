import { MessageCircle, Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'
import ConversationThread from './ConversationThread'

// "10:42" today, "Mon" this week, otherwise "Oct 3"
function shortTime(value, locale) {
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true })
  const days = (now - date) / 86400000
  if (days < 6) return date.toLocaleDateString(locale, { weekday: 'short' })
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export default function Messages() {
  const { t, i18n } = useTranslation()
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    client.get('/chat/conversations/')
      .then(({ data }) => setConversations(data))
      .finally(() => setLoading(false))
  }, [])

  const active = conversations.find((c) => String(c.id) === conversationId)
  const partner = active?.participants.find((p) => p.id !== user.id)

  // newest conversation first, then the search box
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.last_message?.created_at || b.created_at) - new Date(a.last_message?.created_at || a.created_at),
  )
  const shown = sorted.filter((c) => {
    const other = c.participants.find((p) => p.id !== user.id)
    return !query.trim() || other?.full_name.toLowerCase().includes(query.trim().toLowerCase())
  })

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="lp-hero-bg">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 lp-animate-in">
          <h1 className="lp-serif text-[2.25rem] leading-tight sm:text-[3rem]" style={{ color: 'var(--ink)' }}>{t('messages.title')}</h1>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-10">
        <div className="lp-card lp-animate-in lp-delay-1 -mt-10 flex overflow-hidden" style={{ padding: 0, height: 'calc(100vh - 18rem)', minHeight: '28rem', boxShadow: 'var(--shadow-pop)' }}>
          {/* Conversation list */}
          <aside
            className={`${active ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col md:w-80`}
            style={{ borderInlineEnd: '1px solid var(--line)' }}
          >
            <div className="p-4">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-soft)' }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('messages.search')}
                  className="h-10 w-full rounded-full ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {loading ? (
                <p className="p-4 text-sm" style={{ color: 'var(--ink-soft)' }}>{t('messages.loading')}</p>
              ) : conversations.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <span className="lp-icon-badge mx-auto mb-3 h-12 w-12"><MessageCircle size={20} /></span>
                  <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('messages.empty')}</p>
                  <Link to="/partners" className="lp-btn-primary mt-5 text-sm"><Users size={15} /> {t('messages.findPartners')}</Link>
                </div>
              ) : shown.length === 0 ? (
                <p className="p-4 text-sm" style={{ color: 'var(--ink-soft)' }}>{t('messages.noResults')}</p>
              ) : (
                shown.map((c) => {
                  const other = c.participants.find((p) => p.id !== user.id)
                  const isActive = String(c.id) === conversationId
                  const mine = c.last_message?.sender?.id === user.id
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/messages/${c.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/messages/${c.id}`) } }}
                      className="mb-1.5 flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-start transition-colors hover:brightness-95"
                      style={{ background: isActive ? '#fecdd3' : '#eef1f8', color: '#17191d', borderRadius: 'var(--radius-card)' }}
                    >
                      <img src={avatarUrl(other?.id, 80)} alt="" className="lp-avatar h-12 w-12 shrink-0 object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <Link
                            to={`/partners/${other?.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="lp-serif truncate text-[15px] hover:underline underline-offset-2"
                            style={{ color: '#17191d' }}
                          >
                            {other?.full_name}
                          </Link>
                          {c.last_message && (
                            <span className="shrink-0 text-[11px]" style={{ color: 'rgb(23 25 29 / 0.6)' }}>
                              {shortTime(c.last_message.created_at, i18n.resolvedLanguage)}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs" style={{ color: 'rgb(23 25 29 / 0.68)' }}>
                          {c.last_message ? `${mine ? `${t('messages.you')}: ` : ''}${c.last_message.text}` : t('messages.noMessagesYet')}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          {/* Conversation */}
          <section className={`${active ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
            {active ? (
              <ConversationThread conversationId={active.id} partner={partner} onBack={() => navigate('/messages')} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center" style={{ background: 'linear-gradient(160deg, #f4d9cf55, #ede9fe66 60%, #FFF1F255)' }}>
                <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: '#ede9fe', color: '#1E293B' }}><MessageCircle size={34} strokeWidth={1.5} /></span>
                <p className="lp-serif text-2xl" style={{ color: 'var(--ink)' }}>{t('messages.selectConversation')}</p>
                <p className="mt-2 max-w-xs text-sm" style={{ color: 'var(--ink-soft)' }}>{t('messages.selectHint')}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
