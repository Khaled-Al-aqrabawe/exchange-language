import { CalendarPlus, CheckCircle2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { LANGUAGES } from '../constants'
import { DAYS, isSlotExpiredToday, isWithinAvailability } from '../utils/availability'

const todayStr = () => new Date().toISOString().slice(0, 10)
const nowTimeStr = () => new Date().toTimeString().slice(0, 5)

export default function SendSessionRequestModal({ lockedPartnerId, onClose, onSent }) {
  const { t } = useTranslation()
  const [partners, setPartners] = useState([])
  const [partnersLoading, setPartnersLoading] = useState(true)
  const [partnerFilters, setPartnerFilters] = useState({ language: '', level: '' })
  const [lockedPartnerDetail, setLockedPartnerDetail] = useState(null)
  const [form, setForm] = useState({
    partner_id: lockedPartnerId || '',
    date: '',
    start_time: '',
    end_time: '',
    duration_minutes: 40,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const lockedFromPartner = Boolean(lockedPartnerId)

  useEffect(() => {
    if (!lockedPartnerId) return
    client.get(`/matching/partners/${lockedPartnerId}/`)
      .then(({ data }) => {
        setPartnerFilters({ language: data.learning_language, level: data.proficiency_level })
        setLockedPartnerDetail(data)
      })
      .catch(() => {})
  }, [lockedPartnerId])

  useEffect(() => {
    setPartnersLoading(true)
    const params = {}
    if (partnerFilters.language) params.language = partnerFilters.language
    if (partnerFilters.level) params.level = partnerFilters.level
    client.get('/matching/partners/', { params })
      .then(({ data }) => {
        setPartners(data)
        setForm((f) => (f.partner_id && !data.some((p) => String(p.user_id) === String(f.partner_id))
          ? { ...f, partner_id: '' }
          : f))
      })
      .finally(() => setPartnersLoading(false))
  }, [partnerFilters])

  const inputClass = 'w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent'
  const inputStyle = { border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }
  const labelClass = 'block text-sm font-medium mb-1.5'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!partnerFilters.language || !form.partner_id || !form.date || !form.start_time || !form.end_time) {
      setError(t('schedule.errorMissing'))
      return
    }
    const startDateTime = new Date(`${form.date}T${form.start_time}`)
    if (startDateTime <= new Date()) {
      setError(t('partners.pastTimeError'))
      return
    }
    const endDateTime = new Date(`${form.date}T${form.end_time}`)
    if (endDateTime <= startDateTime) {
      setError(t('schedule.windowEndBeforeStart'))
      return
    }
    if (
      lockedPartnerDetail
      && !isWithinAvailability(startDateTime, lockedPartnerDetail.timezone, lockedPartnerDetail.availability)
    ) {
      setError(t('schedule.outsideAvailability'))
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        partner_id: form.partner_id,
        duration_minutes: form.duration_minutes,
        notes: form.notes,
        scheduled_time: startDateTime.toISOString(),
      }
      payload.window_end_time = endDateTime.toISOString()
      await client.post('/sessions/', payload)
      setSent(true)
      onSent?.()
    } catch (err) {
      const data = err.response?.data
      setError(data ? Object.values(data).flat().join(' ') : t('schedule.errorFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 overflow-y-auto" style={{ background: 'color-mix(in srgb, black 45%, transparent)' }}>
      <div className="lp-surface w-full max-w-md p-6 lp-animate-in-scale my-auto" style={{ boxShadow: 'var(--shadow-card-hover)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="lp-icon-badge h-9 w-9">
              <CalendarPlus size={16} />
            </span>
            <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{t('schedule.sendRequestTitle')}</h2>
          </div>
          <button type="button" onClick={onClose} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--ink-soft)' }} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="py-4 text-center lp-animate-in">
            <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'var(--accent-2)' }} />
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--ink)' }}>{t('schedule.requestSent')}</p>
            <button type="button" onClick={onClose} className="lp-btn-primary">{t('common.done')}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div>
                <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('schedule.language')} *</label>
                <select
                  required
                  disabled={lockedFromPartner}
                  value={partnerFilters.language}
                  onChange={(e) => setPartnerFilters({ ...partnerFilters, language: e.target.value })}
                  className={`${inputClass} ${lockedFromPartner ? 'cursor-not-allowed opacity-60' : ''}`}
                  style={inputStyle}
                >
                  <option value="" disabled>{t('schedule.selectLanguage')}</option>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('schedule.partner')} *</label>
              <select
                required
                value={form.partner_id}
                onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                className={`${inputClass} ${(lockedFromPartner || partnersLoading) ? 'cursor-not-allowed opacity-60' : ''}`}
                style={inputStyle}
                disabled={partnersLoading || lockedFromPartner}
              >
                <option value="" disabled>{partnersLoading ? t('partners.loading') : t('schedule.selectAPartner')}</option>
                {partners.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
                ))}
              </select>
              {!partnersLoading && partners.length === 0 && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--ink-soft)' }}>{t('schedule.noPartnersForFilters')}</p>
              )}
            </div>

            <div>
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('schedule.date')} *</label>
              <input
                required
                type="date"
                min={todayStr()}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('schedule.fromTime')} *</label>
                <input
                  required
                  type="time"
                  min={form.date === todayStr() ? nowTimeStr() : undefined}
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('schedule.toTime')} *</label>
                <input
                  required
                  type="time"
                  min={form.date === todayStr() ? form.start_time || nowTimeStr() : undefined}
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>
            {lockedPartnerDetail?.availability?.filter((slot) => !isSlotExpiredToday(slot)).length > 0 && (
              <p className="text-xs -mt-2" style={{ color: 'var(--ink-soft)' }}>
                {t('schedule.partnerAvailability')}{' '}
                {lockedPartnerDetail.availability.filter((slot) => !isSlotExpiredToday(slot)).map((slot, i) => (
                  <span key={slot.id}>
                    {i > 0 && ', '}
                    {t(`profile.days.${DAYS.find((d) => d.value === slot.day_of_week)?.key}`)}
                    {' '}{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                  </span>
                ))}
                {' '}({lockedPartnerDetail.timezone})
              </p>
            )}

            <div>
              <label className={labelClass} style={{ color: 'var(--ink)' }}>{t('schedule.notes')}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {error && <p className="text-sm" style={{ color: '#c1443d' }}>{error}</p>}
            <button type="submit" disabled={submitting} className="lp-btn-primary w-full disabled:opacity-50">
              {submitting ? t('schedule.submitting') : t('schedule.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
