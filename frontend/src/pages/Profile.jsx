import { CheckCircle2, KeyRound, Video, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { COUNTRIES, GENDERS, LANGUAGES } from '../constants'
import LanguageLevelPicker from '../components/LanguageLevelPicker'
import { useAuth } from '../context/AuthContext'
import { resolveAvatarUrl } from '../utils/images'
import { detectTimezone, formatTimezoneOption, timezoneOptions } from '../utils/timezone'

const inputClass = 'w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }
const labelClass = 'block text-sm font-medium mb-1.5'

// Latest date of birth that makes someone at least 16 years old today.
function maxDateOfBirth() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 16)
  return d.toISOString().slice(0, 10)
}

function ChangePasswordCard() {
  const { t } = useTranslation()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setDone(false)
    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      await client.post('/auth/me/change-password/', { old_password: oldPassword, new_password: newPassword })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setDone(true)
    } catch (err) {
      const data = err.response?.data
      setError(data ? Object.values(data).flat().join(' ') : t('profile.changePasswordError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="lp-card mb-6 lp-animate-in lp-delay-4">
      <h2 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
        <KeyRound size={16} /> {t('profile.changePassword')}
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>{t('profile.changePasswordSubtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.currentPassword')}</label>
          <input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.newPassword')}</label>
          <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.confirmNewPassword')}</label>
          <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
        {done && (
          <p className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--accent-2)' }}>
            <CheckCircle2 size={15} /> {t('profile.changePasswordSuccess')}
          </p>
        )}
        <button type="submit" disabled={submitting} className="lp-btn-primary disabled:opacity-50">
          {submitting ? t('profile.changingPassword') : t('profile.changePassword')}
        </button>
      </form>
    </section>
  )
}

export default function Profile() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoError, setVideoError] = useState('')
  const videoInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      const timezone = user.profile.timezone === 'UTC' ? detectTimezone() : user.profile.timezone
      setForm({
        first_name: user.first_name,
        last_name: user.last_name,
        profile: {
          ...user.profile,
          timezone,
          learning_languages: user.profile.learning_languages?.length
            ? user.profile.learning_languages
            : (user.profile.learning_language ? [user.profile.learning_language] : []),
        },
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
    setSaveError('')
    try {
      await client.patch('/auth/me/', form)
      await refreshUser()
      setSaved(true)
    } catch (err) {
      const data = err.response?.data?.profile || err.response?.data
      const msg = data && typeof data === 'object' ? Object.values(data).flat().join(' ') : ''
      if (msg) setSaveError(msg)
      else throw err
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const body = new FormData()
      body.append('avatar', file)
      await client.post('/auth/me/avatar/', body, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshUser()
    } catch {
      setUploadError(t('profile.uploadError'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleVideoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoError('')
    setVideoUploading(true)
    try {
      const body = new FormData()
      body.append('intro_video', file)
      await client.post('/auth/me/video/', body, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshUser()
    } catch {
      setVideoError(t('profile.videoUploadError'))
    } finally {
      setVideoUploading(false)
      e.target.value = ''
    }
  }

  const handleVideoRemove = async () => {
    setVideoError('')
    setVideoUploading(true)
    try {
      await client.delete('/auth/me/video/')
      await refreshUser()
    } catch {
      setVideoError(t('profile.videoUploadError'))
    } finally {
      setVideoUploading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] lp-hero-bg" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight mb-6 lp-animate-in" style={{ color: 'var(--ink)' }}>{t('profile.title')}</h1>

        <form onSubmit={handleSubmit}>
          <section className="lp-card mb-6 lp-animate-in lp-delay-1">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group shrink-0"
                aria-label={t('profile.changePhoto')}
              >
                <img
                  src={resolveAvatarUrl(user.profile.avatar, user.id, 200)}
                  alt=""
                  className="lp-avatar lp-gradient-ring h-16 w-16 object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-sm font-semibold disabled:opacity-50 hover:opacity-75 transition-opacity"
                  style={{ color: 'var(--accent)' }}
                >
                  {uploading ? t('profile.uploading') : t('profile.changePhoto')}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                {uploadError && <p className="text-sm mt-1" style={{ color: '#c1443d' }}>{uploadError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.firstName')}</label>
                <input value={form.first_name} onChange={updateTop('first_name')} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.lastName')}</label>
                <input value={form.last_name} onChange={updateTop('last_name')} className={inputClass} style={inputStyle} />
              </div>
            </div>
          </section>

          <section className="lp-card mb-6 lp-animate-in lp-delay-2">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--ink)' }}>{t('profile.aboutYou')}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.gender')}</label>
                <select value={form.profile.gender} onChange={updateProfile('gender')} className={inputClass} style={inputStyle}>
                  <option value="">{t('profile.select')}</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{t(`genders.${g}`)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.country')}</label>
                <select value={form.profile.country} onChange={updateProfile('country')} className={inputClass} style={inputStyle}>
                  <option value="">{t('profile.select')}</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.dateOfBirth')}</label>
              <input
                type="date"
                max={maxDateOfBirth()}
                value={form.profile.date_of_birth || ''}
                onChange={updateProfile('date_of_birth')}
                className={`${inputClass} sm:w-64`}
                style={inputStyle}
              />
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
          </section>

          <section className="lp-card mb-6 lp-animate-in lp-delay-3">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--ink)' }}>{t('profile.languagesTitle')}</h2>
            <div className="mb-6">
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.spokenLanguages')}</label>
              <LanguageLevelPicker
                mode="speak"
                selected={form.profile.spoken_languages || []}
                levels={form.profile.language_levels || {}}
                onChange={(spoken, levels) =>
                  setForm({ ...form, profile: { ...form.profile, spoken_languages: spoken, language_levels: levels } })}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>{t('profile.spokenLanguagesHint')}</p>
            </div>
            <div className="mb-6">
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.learningLanguages')}</label>
              <LanguageLevelPicker
                mode="learn"
                selected={form.profile.learning_languages || []}
                levels={form.profile.language_levels || {}}
                onChange={(learning, levels) =>
                  setForm({ ...form, profile: { ...form.profile, learning_languages: learning, language_levels: levels } })}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>{t('profile.learningLanguagesHint')}</p>
            </div>
            <div className="mb-4">
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('profile.timezone')}</label>
              <select value={form.profile.timezone} onChange={updateProfile('timezone')} className={`${inputClass} sm:w-64`} style={inputStyle}>
                {timezoneOptions().map((tz) => <option key={tz} value={tz}>{formatTimezoneOption(tz)}</option>)}
              </select>
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
          </section>

          <section className="lp-card mb-6 lp-animate-in lp-delay-4">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--ink)' }}>{t('profile.introVideoTitle')}</h2>
            {user.profile.intro_video ? (
              <div className="space-y-2.5">
                <video src={user.profile.intro_video} controls className="w-full max-w-sm rounded-2xl" style={{ background: 'var(--surface-2)' }} />
                <button
                  type="button"
                  onClick={handleVideoRemove}
                  disabled={videoUploading}
                  className="text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-75 transition-opacity"
                  style={{ color: '#c1443d' }}
                >
                  <X size={14} /> {t('profile.removeVideo')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={videoUploading}
                className="flex items-center gap-2.5 text-start"
              >
                <span className="lp-icon-badge h-9 w-9 shrink-0">
                  <Video size={16} strokeWidth={2} />
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  {videoUploading ? t('profile.uploading') : t('profile.addVideo')}
                </span>
              </button>
            )}
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
            {videoError && <p className="text-sm mt-2" style={{ color: '#c1443d' }}>{videoError}</p>}
          </section>

          <div className="flex items-center gap-3 mb-6 lp-animate-in lp-delay-5">
            <button type="submit" disabled={saving} className="lp-btn-primary disabled:opacity-50">
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
            {saveError && <p className="text-sm" style={{ color: '#c1443d' }}>{saveError}</p>}
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--accent-2)' }}>
                <CheckCircle2 size={15} /> {t('profile.saved')}
              </span>
            )}
          </div>
        </form>

        <ChangePasswordCard />
      </div>
    </div>
  )
}
