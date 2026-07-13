import { CalendarClock, MessageCircle, Target, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

export default function PartnerProfile() {
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

  if (loading) return <div className="p-16 text-center text-slate-500 text-sm">Loading...</div>
  if (!partner) return <div className="p-16 text-center text-slate-500 text-sm">Partner not found.</div>

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="h-24 bg-gradient-to-br from-indigo-600 to-violet-600" />
          <div className="px-8 pb-8">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <img
                src={avatarUrl(partner.user_id, 160)}
                alt=""
                className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white"
              />
              <span
                className={`mb-2 text-xs px-2.5 py-1 rounded-full font-medium ${
                  partner.match_type === 'exchange'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {partner.match_type === 'exchange' ? 'Exchange match' : 'Peer practice'}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{partner.full_name}</h1>
            <p className="text-slate-600 mt-1">
              Speaks <strong className="text-slate-900">{partner.native_language}</strong> · Learning{' '}
              <strong className="text-slate-900">{partner.learning_language}</strong>
            </p>
            <p className="text-sm text-slate-400 mb-6 capitalize">
              {partner.proficiency_level} · {partner.timezone}
            </p>

            {partner.bio && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900 mb-1">Bio</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{partner.bio}</p>
              </div>
            )}
            {partner.learning_goals && (
              <div className="mb-6 flex items-start gap-2">
                <Target size={15} className="text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-1">Learning goals</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{partner.learning_goals}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleMessage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
              >
                <MessageCircle size={16} /> Message
              </button>
              <button
                onClick={handleCallNow}
                disabled={starting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors"
              >
                <Video size={16} /> Start video call
              </button>
              <button
                onClick={() => navigate(`/schedule?partner=${userId}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                <CalendarClock size={16} /> Schedule a session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
