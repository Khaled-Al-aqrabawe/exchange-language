import { Camera, CheckCircle2, Globe2, KeyRound, Languages, User, Video, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { COUNTRIES, GENDERS, LANGUAGES } from '../constants'
import LanguageLevelPicker from '../components/LanguageLevelPicker'
import { ModalField as Field, modalInputClass as fieldClass, modalInputStyle as fieldStyle } from '../components/ModalShell'
import { useAuth } from '../context/AuthContext'
import { resolveAvatarUrl } from '../utils/images'
import { detectTimezone, formatTimezoneOption, timezoneOptions } from '../utils/timezone'

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
    <section className="lp-card lp-animate-in">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold" style={{ color: 'var(--ink)' }}>
        <KeyRound size={18} style={{ color: 'var(--accent)' }} /> {t('profile.changePassword')}
      </h2>
      <p className="mb-5 text-sm" style={{ color: 'var(--ink-soft)' }}>{t('profile.changePasswordSubtitle')}</p>
      <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
        <Field label={t('profile.currentPassword')}>
          <input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={fieldClass} style={fieldStyle} />
        </Field>
        <Field label={t('profile.newPassword')}>
          <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={fieldClass} style={fieldStyle} />
        </Field>
        <Field label={t('profile.confirmNewPassword')}>
          <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={fieldClass} style={fieldStyle} />
        </Field>
        {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}
        {done && (
          <p className="flex items-center gap-1.5 text-sm" style={{ color: '#34d399' }}>
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
  const [tab, setTab] = useState('basics')
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

  // How complete the profile is, to nudge people toward the details partners look at
  const checks = [
    form.first_name, form.last_name, user.profile.avatar, form.profile.gender, form.profile.country,
    form.profile.date_of_birth, form.profile.bio, (form.profile.spoken_languages || []).length || form.profile.native_language,
    (form.profile.learning_languages || []).length, form.profile.learning_goals, user.profile.intro_video,
  ]
  const completion = Math.round((checks.filter(Boolean).length / checks.length) * 100)
  const fullName = `${form.first_name} ${form.last_name}`.trim() || user.email

  const tabs = [
    ['basics', User, t('profile.tabs.basics')],
    ['languages', Languages, t('profile.tabs.languages')],
    ['video', Video, t('profile.tabs.video')],
    ['security', KeyRound, t('profile.tabs.security')],
  ]

  return (
    <div className="min-h-[calc(100vh-4rem)] lp-hero-bg" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
          {/* Summary card - stays in view while the forms scroll */}
          <aside className="lp-card lp-animate-in text-center lg:sticky lg:top-24" style={{ padding: '1.5rem' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group relative mx-auto block"
              aria-label={t('profile.changePhoto')}
            >
              <img src={resolveAvatarUrl(user.profile.avatar, user.id, 240)} alt="" className="lp-avatar lp-gradient-ring h-24 w-24 object-cover" />
              <span
                className="absolute -bottom-1 -end-1 flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform group-hover:scale-110"
                style={{ background: 'var(--gradient-brand)', border: '3px solid var(--surface)' }}
              >
                <Camera size={14} />
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            {uploadError && <p className="mt-2 text-xs" style={{ color: '#f87171' }}>{uploadError}</p>}
            {uploading && <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>{t('profile.uploading')}</p>}

            <h1 className="mt-4 truncate font-display text-xl font-extrabold" style={{ color: 'var(--ink)' }}>{fullName}</h1>
            <p className="truncate text-xs" style={{ color: 'var(--ink-soft)' }}>{user.email}</p>

            {(form.profile.native_language || (form.profile.learning_languages || []).length > 0) && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {form.profile.native_language && <span className="lp-tag">{form.profile.native_language}</span>}
                {(form.profile.learning_languages || []).slice(0, 3).map((l) => <span key={l} className="lp-tag lp-tag--accent">{l}</span>)}
              </div>
            )}

            <div className="mt-5 text-start">
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                <span style={{ color: 'var(--ink-soft)' }}>{t('profile.completion')}</span>
                <span style={{ color: 'var(--accent)' }}>{completion}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completion}%`, background: 'linear-gradient(90deg, var(--accent), var(--gold))' }} />
              </div>
              {completion < 100 && <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>{t('profile.completionHint')}</p>}
            </div>

            {tab !== 'security' && (
              <div className="mt-5">
                <button type="submit" form="profile-form" disabled={saving} className="lp-btn-primary w-full disabled:opacity-50">
                  {saving ? t('profile.saving') : t('profile.save')}
                </button>
                {saveError && <p className="mt-2 text-xs" style={{ color: '#f87171' }}>{saveError}</p>}
                {saved && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#34d399' }}>
                    <CheckCircle2 size={14} /> {t('profile.saved')}
                  </p>
                )}
              </div>
            )}
          </aside>

          {/* Tabbed forms: one section at a time keeps the page short */}
          <div className="min-w-0">
            <div className="lp-animate-in lp-delay-1 mb-4 inline-flex max-w-full overflow-x-auto rounded-full p-1" style={{ background: 'var(--surface-2)' }}>
              {tabs.map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setTab(key); setSaved(false) }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all"
                  style={tab === key
                    ? { background: 'var(--gradient-brand)', color: 'var(--accent-ink)', boxShadow: '0 6px 16px -8px rgb(124 92 255 / 0.9)' }
                    : { color: 'var(--ink-soft)' }}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {tab === 'security' ? (
              <ChangePasswordCard />
            ) : (
              <form id="profile-form" onSubmit={handleSubmit} className="lp-card lp-animate-in">
                {tab === 'basics' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('profile.firstName')}>
                      <input value={form.first_name} onChange={updateTop('first_name')} className={fieldClass} style={fieldStyle} />
                    </Field>
                    <Field label={t('profile.lastName')}>
                      <input value={form.last_name} onChange={updateTop('last_name')} className={fieldClass} style={fieldStyle} />
                    </Field>
                    <Field label={t('profile.gender')}>
                      <select value={form.profile.gender} onChange={updateProfile('gender')} className={fieldClass} style={fieldStyle}>
                        <option value="">{t('profile.select')}</option>
                        {GENDERS.map((g) => <option key={g} value={g}>{t(`genders.${g}`)}</option>)}
                      </select>
                    </Field>
                    <Field label={t('profile.country')}>
                      <select value={form.profile.country} onChange={updateProfile('country')} className={fieldClass} style={fieldStyle}>
                        <option value="">{t('profile.select')}</option>
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label={t('profile.dateOfBirth')}>
                      <input type="date" max={maxDateOfBirth()} value={form.profile.date_of_birth || ''} onChange={updateProfile('date_of_birth')} className={fieldClass} style={fieldStyle} />
                    </Field>
                    <Field label={t('profile.timezone')} icon={Globe2}>
                      <select value={form.profile.timezone} onChange={updateProfile('timezone')} className={`${fieldClass} ps-11`} style={fieldStyle}>
                        {timezoneOptions().map((tz) => <option key={tz} value={tz}>{formatTimezoneOption(tz)}</option>)}
                      </select>
                    </Field>
                    <Field label={t('profile.bio')} className="sm:col-span-2">
                      <textarea
                        value={form.profile.bio}
                        onChange={updateProfile('bio')}
                        rows={3}
                        className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        style={fieldStyle}
                        placeholder={t('profile.bioPlaceholder')}
                      />
                    </Field>
                  </div>
                )}

                {tab === 'languages' && (
                  <div className="space-y-6">
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{t('profile.spokenLanguages')}</p>
                      <LanguageLevelPicker
                        mode="speak"
                        selected={form.profile.spoken_languages || []}
                        levels={form.profile.language_levels || {}}
                        onChange={(spoken, levels) =>
                          setForm({ ...form, profile: { ...form.profile, spoken_languages: spoken, language_levels: levels } })}
                      />
                      <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>{t('profile.spokenLanguagesHint')}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{t('profile.learningLanguages')}</p>
                      <LanguageLevelPicker
                        mode="learn"
                        selected={form.profile.learning_languages || []}
                        levels={form.profile.language_levels || {}}
                        onChange={(learning, levels) =>
                          setForm({ ...form, profile: { ...form.profile, learning_languages: learning, language_levels: levels } })}
                      />
                      <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>{t('profile.learningLanguagesHint')}</p>
                    </div>
                    <Field label={t('profile.learningGoals')}>
                      <textarea
                        value={form.profile.learning_goals}
                        onChange={updateProfile('learning_goals')}
                        rows={2}
                        className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        style={fieldStyle}
                        placeholder={t('profile.learningGoalsPlaceholder')}
                      />
                    </Field>
                  </div>
                )}

                {tab === 'video' && (
                  <div>
                    <h2 className="mb-1 font-display text-lg font-bold" style={{ color: 'var(--ink)' }}>{t('profile.introVideoTitle')}</h2>
                    <p className="mb-4 text-sm" style={{ color: 'var(--ink-soft)' }}>{t('profile.introVideoHint')}</p>
                    {user.profile.intro_video ? (
                      <div className="space-y-3">
                        <video src={user.profile.intro_video} controls className="w-full max-w-md rounded-2xl" style={{ background: 'var(--surface-2)' }} />
                        <button
                          type="button"
                          onClick={handleVideoRemove}
                          disabled={videoUploading}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-75 disabled:opacity-50"
                          style={{ color: '#f87171' }}
                        >
                          <X size={14} /> {t('profile.removeVideo')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={videoUploading}
                        className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl px-6 py-10 text-center transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                        style={{ border: '2px dashed color-mix(in srgb, var(--accent) 40%, var(--line))' }}
                      >
                        <span className="lp-icon-badge h-12 w-12"><Video size={22} /></span>
                        <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                          {videoUploading ? t('profile.uploading') : t('profile.addVideo')}
                        </span>
                      </button>
                    )}
                    <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                    {videoError && <p className="mt-2 text-sm" style={{ color: '#f87171' }}>{videoError}</p>}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
