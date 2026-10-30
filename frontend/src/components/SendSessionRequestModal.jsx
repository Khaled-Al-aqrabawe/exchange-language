import { CalendarCheck, CalendarPlus, CheckCircle2, Clock, Info, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { DAYS, isSlotExpiredToday, isWithinAvailability, timeStrPlusMinutes } from '../utils/availability'
import { useAuth } from '../context/AuthContext'
import SessionTypePicker from './SessionTypePicker'
import ModalShell, { Chip, ModalField, localDateString, modalInputClass, modalInputStyle } from './ModalShell'

const nowTimeStr = () => new Date().toTimeString().slice(0, 5)
const SESSION_MINUTES = 40 // every session is the same length

export default function SendSessionRequestModal({ lockedPartnerId, onClose, onSent }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [partners, setPartners] = useState([])
  const [partnersLoading, setPartnersLoading] = useState(true)
  const [partnerFilters, setPartnerFilters] = useState({ language: user?.profile?.learning_language || '' })
  const [lockedPartnerDetail, setLockedPartnerDetail] = useState(null)
  const [form, setForm] = useState({
    partner_id: lockedPartnerId || '',
    date: '',
    start_time: '',
    end_time: '',
        notes: '',
    session_type: 'lesson',
    lesson: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const lockedFromPartner = Boolean(lockedPartnerId)
  const today = localDateString(0)

  useEffect(() => {
    if (!lockedPartnerId) return
    client.get(`/matching/partners/${lockedPartnerId}/`)
      .then(({ data }) => {
        setPartnerFilters({ language: data.learning_language })
        setLockedPartnerDetail(data)
      })
      .catch(() => {})
  }, [lockedPartnerId])

  useEffect(() => {
    setPartnersLoading(true)
    const params = {}
    if (partnerFilters.language) params.language = partnerFilters.language
    client.get('/matching/partners/', { params })
      .then(({ data }) => {
        setPartners(data)
        setForm((f) => (f.partner_id && !data.some((p) => String(p.user_id) === String(f.partner_id))
          ? { ...f, partner_id: '' }
          : f))
      })
      .finally(() => setPartnersLoading(false))
  }, [partnerFilters])

  // Picking a start time or a length fills in the end time, which can still be changed by hand.
  const setStart = (start_time) => setForm((f) => ({ ...f, start_time, end_time: start_time ? timeStrPlusMinutes(start_time, SESSION_MINUTES) : '' }))

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
      await client.post('/sessions/', {
        partner_id: form.partner_id,
        duration_minutes: SESSION_MINUTES,
        notes: form.notes,
        session_type: form.session_type,
        lesson: form.session_type === 'lesson' && form.lesson ? Number(form.lesson) : null,
        scheduled_time: startDateTime.toISOString(),
        window_end_time: endDateTime.toISOString(),
      })
      setSent(true)
      onSent?.()
    } catch (err) {
      const data = err.response?.data
      setError(data ? Object.values(data).flat().join(' ') : t('schedule.errorFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const partnerSlots = (lockedPartnerDetail?.availability || []).filter((slot) => !isSlotExpiredToday(slot))
  const dayChips = [0, 1].map((offset) => {
    const value = localDateString(offset)
    const label = offset === 0 ? t('modal.today') : offset === 1 ? t('modal.tomorrow')
      : new Date(`${value}T00:00:00`).toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short', day: 'numeric' })
    return { value, label }
  })

  return (
    <ModalShell
      wide
      icon={CalendarPlus}
      title={t('schedule.sendRequestTitle')}
      subtitle={sent ? undefined : t('schedule.requestSubtitle')}
      onClose={onClose}
      footer={sent ? null : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="lp-btn-secondary shrink-0">{t('common.cancel')}</button>
          <button type="submit" form="session-request-form" disabled={submitting} className="lp-btn-primary flex-1 disabled:opacity-50">
            {submitting ? t('schedule.submitting') : t('schedule.submit')}
          </button>
        </div>
      )}
    >
      {sent ? (
        <div className="lp-animate-in py-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, #34d399 18%, transparent)', color: '#34d399' }}>
            <CheckCircle2 size={34} />
          </span>
          <p className="mb-6 font-display text-lg font-bold" style={{ color: 'var(--ink)' }}>{t('schedule.requestSent')}</p>
          <button type="button" onClick={onClose} className="lp-btn-primary">{t('common.done')}</button>
        </div>
      ) : (
        <form id="session-request-form" onSubmit={handleSubmit} className="space-y-5">
          <div>
            <ModalField
              label={`${t('schedule.partner')} *`}
              icon={User}
              hint={!partnersLoading && partners.length === 0 ? t('schedule.noPartnersForFilters') : undefined}
            >
              <select
                required
                value={form.partner_id}
                onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                className={`${modalInputClass} ps-11 ${(lockedFromPartner || partnersLoading) ? 'cursor-not-allowed opacity-60' : ''}`}
                style={modalInputStyle}
                disabled={partnersLoading || lockedFromPartner}
              >
                <option value="" disabled>{partnersLoading ? t('partners.loading') : t('schedule.selectAPartner')}</option>
                {partners.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
              </select>
            </ModalField>
          </div>

          <SessionTypePicker type={form.session_type} lesson={form.lesson} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />

          <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <ModalField label={`${t('schedule.date')} *`} icon={CalendarCheck}>
              <input
                required
                type="date"
                min={today}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={`${modalInputClass} ps-11`}
                style={modalInputStyle}
              />
            </ModalField>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {dayChips.map((c) => (
                <Chip key={c.value} active={form.date === c.value} onClick={() => setForm({ ...form, date: c.value })}>{c.label}</Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-4">
              <ModalField label={`${t('schedule.fromTime')} *`} icon={Clock}>
                <input
                  required
                  type="time"
                  min={form.date === today ? nowTimeStr() : undefined}
                  value={form.start_time}
                  onChange={(e) => setStart(e.target.value)}
                  className={`${modalInputClass} ps-11`}
                  style={modalInputStyle}
                />
              </ModalField>
              <ModalField label={`${t('schedule.toTime')} *`} icon={Clock}>
                <input
                  required
                  type="time"
                  min={form.date === today ? form.start_time || nowTimeStr() : undefined}
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className={`${modalInputClass} ps-11`}
                  style={modalInputStyle}
                />
              </ModalField>
            </div>
          </div>

          </div>

          {partnerSlots.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: 'color-mix(in srgb, var(--accent) 10%, var(--surface))', border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))' }}>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                <Info size={14} /> {t('schedule.partnerAvailability')} · {lockedPartnerDetail.timezone}
              </p>
              <div className="flex flex-wrap gap-2">
                {partnerSlots.map((slot) => (
                  <span key={slot.id} className="lp-tag lp-tag--accent">
                    {t(`profile.days.${DAYS.find((d) => d.value === slot.day_of_week)?.key}`)} {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <ModalField label={t('schedule.notes')}>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={modalInputStyle}
            />
          </ModalField>

          {error && (
            <p className="rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: 'color-mix(in srgb, #f87171 14%, transparent)', color: '#f87171' }}>{error}</p>
          )}
        </form>
      )}
    </ModalShell>
  )
}
