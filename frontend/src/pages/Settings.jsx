import { LogOut, Mail, UserCog } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifyMessages, setNotifyMessages] = useState(
    localStorage.getItem('notify_messages') !== 'false'
  )
  const [notifySessions, setNotifySessions] = useState(
    localStorage.getItem('notify_sessions') !== 'false'
  )

  const toggleMessages = () => {
    const next = !notifyMessages
    setNotifyMessages(next)
    localStorage.setItem('notify_messages', String(next))
  }

  const toggleSessions = () => {
    const next = !notifySessions
    setNotifySessions(next)
    localStorage.setItem('notify_sessions', String(next))
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Settings</h1>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <img src={avatarUrl(user?.id, 100)} alt="" className="h-14 w-14 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{user?.full_name}</p>
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <Mail size={13} /> {user?.email}
              </p>
            </div>
            <Link
              to="/profile"
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 shrink-0"
            >
              <UserCog size={15} /> Edit profile
            </Link>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Notifications</h2>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-slate-700">New message alerts</span>
            <Toggle checked={notifyMessages} onChange={toggleMessages} />
          </div>
          <div className="flex items-center justify-between py-2.5 border-t border-slate-100">
            <span className="text-sm text-slate-700">Session reminders</span>
            <Toggle checked={notifySessions} onChange={toggleSessions} />
          </div>
        </section>

        <button
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 shadow-sm transition-colors"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  )
}
