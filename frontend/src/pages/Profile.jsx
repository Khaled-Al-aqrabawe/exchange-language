import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { LANGUAGES, LEVELS, TIMEZONES } from '../constants'
import { useAuth } from '../context/AuthContext'
import { avatarUrl } from '../utils/images'

const inputClass = 'w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }
const labelClass = 'block text-sm font-medium mb-1.5'

export default function Profile() {
  const { t } = useTranslation()
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

  if (!form) return <div className="p-16 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{t('profile.loading')}</div>

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
    <div className="min-h-[calc(100vh-4rem)]" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight mb-6" style={{ color: 'var(--ink)' }}>{t('profile.title')}</h1>
        <form onSubmit={handleSubmit} className="lp-card space-y-5">
          <div className="flex items-center gap-4 pb-2">
            <img src={avatarUrl(user.id, 100)} alt="" className="h-16 w-16 rounded-full object-cover" />
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t('profile.photoNote')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.firstName')}</label>
              <input value={form.first_name} onChange={updateTop('first_name')} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.lastName')}</label>
              <input value={form.last_name} onChange={updateTop('last_name')} className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.bio')}</label>
            <textarea
              value={form.profile.bio}
              onChange={updateProfile('bio')}
              rows={3}
              className={inputClass}
              style={inputStyle}
              placeholder={t('profile.bioPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.nativeLanguage')}</label>
              <select value={form.profile.native_language} onChange={updateProfile('native_language')} className={inputClass} style={inputStyle}>
                <option value="">{t('profile.select')}</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.learningLanguage')}</label>
              <select value={form.profile.learning_language} onChange={updateProfile('learning_language')} className={inputClass} style={inputStyle}>
                <option value="">{t('profile.select')}</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.proficiencyLevel')}</label>
              <select value={form.profile.proficiency_level} onChange={updateProfile('proficiency_level')} className={inputClass} style={inputStyle}>
                {LEVELS.map(([value]) => <option key={value} value={value}>{t(`levels.${value}`)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.timezone')}</label>
              <select value={form.profile.timezone} onChange={updateProfile('timezone')} className={inputClass} style={inputStyle}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.learningGoals')}</label>
            <textarea
              value={form.profile.learning_goals}
              onChange={updateProfile('learning_goals')}
              rows={2}
              className={inputClass}
              style={inputStyle}
              placeholder={t('profile.learningGoalsPlaceholder')}
            />
          </div>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving} className="lp-btn-primary disabled:opacity-50">
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--accent-2)' }}>
                <CheckCircle2 size={15} /> {t('profile.saved')}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
