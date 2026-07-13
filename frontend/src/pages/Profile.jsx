import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import client from '../api/client'
import { LANGUAGES, LEVELS, TIMEZONES } from '../constants'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

const inputClass = 'w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name,
        last_name: user.last_name,
        profile: { ...user.profile },
      })
    }
  }, [user])

  if (!form) return <div className="p-16 text-center text-slate-500 text-sm">Loading...</div>

  const updateTop = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const updateProfile = (field) => (e) =>
    setForm({ ...form, profile: { ...form.profile, [field]: e.target.value } })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await client.patch('/auth/me/', form)
      await refreshUser()
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Your profile</h1>
        <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 pb-2">
            <img src={avatarUrl(user.id, 100)} alt="" className="h-16 w-16 rounded-full object-cover" />
            <p className="text-sm text-slate-500">Your photo is generated automatically from your account.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First name</label>
              <input value={form.first_name} onChange={updateTop('first_name')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input value={form.last_name} onChange={updateTop('last_name')} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              value={form.profile.bio}
              onChange={updateProfile('bio')}
              rows={3}
              className={inputClass}
              placeholder="Tell partners a bit about yourself..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Native language</label>
              <select value={form.profile.native_language} onChange={updateProfile('native_language')} className={inputClass}>
                <option value="">Select...</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Learning language</label>
              <select value={form.profile.learning_language} onChange={updateProfile('learning_language')} className={inputClass}>
                <option value="">Select...</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Proficiency level</label>
              <select value={form.profile.proficiency_level} onChange={updateProfile('proficiency_level')} className={inputClass}>
                {LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Timezone</label>
              <select value={form.profile.timezone} onChange={updateProfile('timezone')} className={inputClass}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Learning goals</label>
            <textarea
              value={form.profile.learning_goals}
              onChange={updateProfile('learning_goals')}
              rows={2}
              className={inputClass}
              placeholder="What do you want to achieve?"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle2 size={15} /> Saved!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
