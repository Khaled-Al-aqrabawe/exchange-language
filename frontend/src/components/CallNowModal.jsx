import { Phone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import ModalShell from './ModalShell'
import SessionTypePicker from './SessionTypePicker'

// "Call now": before ringing, choose what the call is for. The other person sees the choice
// (and the lesson, if one is picked) in the incoming-call notice.
export default function CallNowModal({ partnerId, partnerName, onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [choice, setChoice] = useState({ session_type: 'lesson', lesson: '' })
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setBusy(true)
    try {
      const { data } = await client.post('/calls/ring/', {
        partner_id: partnerId,
        notify: false,
        session_type: choice.session_type,
        lesson: choice.session_type === 'lesson' && choice.lesson ? Number(choice.lesson) : null,
      })
      navigate(`/call/${data.room_id}?from=${user.id}&name=${encodeURIComponent(user.full_name)}`)
    } catch {
      window.alert(t('call.ringError'))
      setBusy(false)
    }
  }

  return (
    <ModalShell
      icon={Phone}
      title={t('partners.callNow')}
      subtitle={partnerName ? t('partners.callNowSubtitle', { name: partnerName, defaultValue: 'What do you want to do with {{name}}?' }) : undefined}
      onClose={onClose}
      footer={(
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="lp-btn-secondary shrink-0">{t('common.cancel')}</button>
          <button type="button" onClick={start} disabled={busy} className="lp-btn-primary flex-1 disabled:opacity-50">
            <Phone size={15} /> {t('partners.callNow')}
          </button>
        </div>
      )}
    >
      <SessionTypePicker type={choice.session_type} lesson={choice.lesson} onChange={(patch) => setChoice((c) => ({ ...c, ...patch }))} />
    </ModalShell>
  )
}
