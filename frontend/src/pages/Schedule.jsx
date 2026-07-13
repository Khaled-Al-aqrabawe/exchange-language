import { CalendarClock, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

const statusStyle = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
}

export default function Schedule() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [partners, setPartners] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    partner_id: searchParams.get('partner') || '',
    scheduled_time: '',
    duration_minutes: 30,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadSessions = () => client.get('/sessions/').then(({ data }) => setSessions(data))

  useEffect(() => {
    Promise.all([client.get('/matching/partners/'), loadSessions()])
      .then(([p]) => setPartners(p.data))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.partner_id || !form.scheduled_time) {
      setError('Please choose a partner and a time.')
      return
    }
    setSubmitting(true)
    try {
      await client.post('/sessions/', {
        ...form,
        scheduled_time: new Date(form.scheduled_time).toISOString(),
      })
      await loadSessions()
      setForm({ ...form, notes: '' })
    } catch {
      setError('Could not schedule the session.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id, status) => {
    await client.patch(`/sessions/${id}/status/`, { status })
    loadSessions()
  }

  const inputClass = 'w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Schedule a session</h1>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 mb-10 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Partner</label>
              <select
                value={form.partner_id}
                onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                className={inputClass}
              >
                <option value="">Select a partner...</option>
                {partners.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date & time</label>
              <input
                type="datetime-local"
                value={form.scheduled_time}
                onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (minutes)</label>
            <input
              type="number"
              min={15}
              step={15}
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              className={`${inputClass} w-32`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Scheduling...' : 'Schedule session'}
          </button>
        </form>

        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your sessions</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <CalendarClock size={18} />
            </div>
            <p className="text-slate-500 text-sm">No sessions scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const isHost = s.host.id === user.id
              const other = isHost ? s.partner : s.host
              return (
                <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <img src={avatarUrl(other.id, 70)} alt="" className="h-11 w-11 rounded-full object-cover" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {new Date(s.scheduled_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        {' · '}{s.duration_minutes} min
                      </p>
                      <p className="text-sm text-slate-500">
                        with {other.full_name}{' '}
                        <span className={`ml-1 text-xs px-2 py-0.5 rounded-full capitalize ${statusStyle[s.status]}`}>
                          {s.status}
                        </span>
                      </p>
                      {s.notes && <p className="text-sm text-slate-500 mt-1">{s.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isHost && s.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(s.id, 'confirmed')}
                        className="text-sm px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium"
                      >
                        Confirm
                      </button>
                    )}
                    {s.status !== 'cancelled' && s.status !== 'completed' && (
                      <button
                        onClick={() => updateStatus(s.id, 'cancelled')}
                        className="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium"
                      >
                        Cancel
                      </button>
                    )}
                    {s.status === 'confirmed' && (
                      <Link
                        to={`/call/${s.room_id}`}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-medium"
                      >
                        <Video size={14} /> Join call
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
