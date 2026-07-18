import { CalendarClock, MessageCircle, Target, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

export default function PartnerProfile() {
  const { t } = useTranslation()
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    setLoading(true)
    client.get(`/matching/partners/${userId}/`)
      .then(({ data }) => setPartner(data))
      .finally(() => setLoading(false))
  }, [userId])

  const handleMessage = async () => {
    const { data } = await client.post('/chat/conversations/start/', { partner_id: userId })
    navigate(`/messages/${data.id}`)
  }

  const handleCallNow = () => {
    setStarting(true)
    const roomId = [user.id, Number(userId)].sort((a, b) => a - b).join('-')
    navigate(`/call/${roomId}`)
  }

  if (loading) return <div className="p-16 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('partnerProfile.loading')}</div>
  if (!partner) return <div className="p-16 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('partnerProfile.notFound')}</div>

  return (
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="lp-surface overflow-hidden">
          <div className="h-24" style={{ background: 'var(--accent)' }} />
          <div className="px-8 pb-8">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <img
                src={avatarUrl(partner.user_id, 160)}
                alt=""
                className="lp-avatar h-20 w-20"
                style={{ border: '4px solid var(--surface)' }}
              />
              <span className={`mb-2 ${partner.match_type === 'exchange' ? 'lp-tag lp-tag--accent2' : 'lp-tag'}`}>
                {partner.match_type === 'exchange' ? t('partnerProfile.exchangeMatch') : t('partnerProfile.peerPractice')}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{partner.full_name}</h1>
            <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>
              <Trans
                i18nKey="partnerProfile.speaksLearning"
                values={{ native: partner.native_language, learning: partner.learning_language }}
                components={{ native: <strong style={{ color: 'var(--ink)' }} />, learning: <strong style={{ color: 'var(--ink)' }} /> }}
              />
            </p>
            <p className="text-sm mb-6 capitalize" style={{ color: 'var(--ink-soft)', opacity: 0.75 }}>
              {t(`levels.${partner.proficiency_level}`, partner.proficiency_level)} · {partner.timezone}
            </p>

            {partner.bio && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('partnerProfile.bio')}</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{partner.bio}</p>
              </div>
            )}
            {partner.learning_goals && (
              <div className="mb-6 flex items-start gap-2">
                <Target size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <div>
                  <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('partnerProfile.learningGoals')}</h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{partner.learning_goals}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={handleMessage} className="lp-btn-primary">
                <MessageCircle size={16} /> {t('partnerProfile.message')}
              </button>
              <button
                onClick={handleCallNow}
                disabled={starting}
                className="inline-flex items-center gap-2 px-5 py-2.5 font-semibold transition-colors hover:opacity-70"
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-tag)', color: 'var(--accent)' }}
              >
                <Video size={16} /> {t('partnerProfile.startVideoCall')}
              </button>
              <button
                onClick={() => navigate(`/schedule?partner=${userId}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 font-semibold transition-colors hover:opacity-70"
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-tag)', color: 'var(--ink)' }}
              >
                <CalendarClock size={16} /> {t('partnerProfile.scheduleSession')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
