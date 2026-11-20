import { CalendarDays, Check, Clock, MessagesSquare, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { resolveAvatarUrl } from '../utils/images'
import ModalShell, { ModalField, modalInputClass, modalInputStyle } from './ModalShell'

const MAX_INVITES = 3 // the host plus three more makes four

// "Create a small group": choose what it is for and (optionally) invite partners. It then
// shows in the open-groups list so anyone can take a free seat; at most 4 people in total.
export default function CreateGroupModal({ onClose, onCreated }) {
  const { t } = useTranslation()
  const [partners, setPartners] = useState([])
  const [invited, setInvited] = useState([])
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/matching/partners/')
      .then(({ data }) => setPartners([...data].sort((a, b) => Number(b.is_available_now) - Number(a.is_available_now))))
      .catch(() => {})
  }, [])

  const toggle = (id) => setInvited((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length < MAX_INVITES ? [...list, id] : list))

  const start = async () => {
    setError('')
    const when = date && time ? new Date(`${date}T${time}`) : null
    if (!when || Number.isNaN(when.getTime())) { setError(t('group.pickTime', 'Choose a date and time.')); return }
    if (when < new Date()) { setError(t('group.pastTime', 'Choose a time in the future.')); return }
    setBusy(true)
    try {
      await client.post('/calls/groups/', {
        scheduled_time: when.toISOString(),
        session_type: 'conversation',
        invite_ids: invited,
      })
      onCreated?.()
      onClose()
    } catch (err) {
      setError(Object.values(err.response?.data || {}).flat().join(' ') || t('group.createError', 'Could not schedule the group. Please try again.'))
      setBusy(false)
    }
  }

  return (
    <ModalShell
      icon={Users}
      title={t('group.createTitle', 'Create a small group')}
      subtitle={t('group.createSubtitle', 'Pick a day and time. Up to 4 people including you; others can reserve a seat.')}
      onClose={onClose}
      footer={(
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="lp-btn-secondary shrink-0">{t('common.cancel')}</button>
          <button type="button" onClick={start} disabled={busy} className="lp-btn-primary flex-1 disabled:opacity-50">
            <Users size={15} /> {t('group.schedule', 'Schedule group')}
          </button>
        </div>
      )}
    >
      <div className="mb-5 grid grid-cols-2 gap-3">
        <ModalField label={t('group.date', 'Date')} icon={CalendarDays}>
          <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={modalInputClass} style={modalInputStyle} />
        </ModalField>
        <ModalField label={t('group.time', 'Time')} icon={Clock}>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={modalInputClass} style={modalInputStyle} />
        </ModalField>
      </div>

      <p className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', color: 'var(--accent)' }}>
        <MessagesSquare size={14} /> {t('partners.typeConversation', 'Free conversation')}
      </p>

      <div className="mt-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>
          {t('group.invite', 'Invite partners (optional)')} · {invited.length}/{MAX_INVITES}
        </p>
        <div className="max-h-48 space-y-1.5 overflow-y-auto pe-1">
          {partners.length === 0 && <p className="py-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{t('group.noPartners', 'No partners to invite yet.')}</p>}
          {partners.map((p) => {
            const on = invited.includes(p.user_id)
            const locked = !on && invited.length >= MAX_INVITES
            return (
              <button
                key={p.user_id}
                type="button"
                onClick={() => toggle(p.user_id)}
                disabled={locked}
                className="flex w-full items-center gap-3 px-3 py-2 text-start transition-colors disabled:opacity-40"
                style={{ background: on ? '#fecdd3' : 'var(--surface-2)', color: on ? '#17191d' : 'var(--ink)', borderRadius: 'var(--radius-control)' }}
              >
                <img src={resolveAvatarUrl(p.avatar, p.user_id, 64)} alt="" className="lp-avatar h-8 w-8 shrink-0 object-cover" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.full_name}</span>
                {p.is_available_now && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: '#22c55e' }} title={t('partners.visibilityNow')} />}
                {on && <Check size={16} />}
              </button>
            )
          })}
        </div>
      </div>
      {error && <p className="mt-3 text-sm" style={{ color: '#c1443d' }}>{error}</p>}
    </ModalShell>
  )
}
