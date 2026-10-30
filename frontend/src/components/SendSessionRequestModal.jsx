import { BookOpen, CalendarCheck, CalendarPlus, CheckCircle2, Clock, MessagesSquare, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { isSlotExpiredToday, slotOccurrenceUtcInstant, timeStrPlusMinutes } from '../utils/availability'
import ModalShell, { ModalField, modalInputClass, modalInputStyle } from './ModalShell'

const SESSION_MINUTES = 40 // every session is the same length

const pad = (n) => String(n).padStart(2, '0')
const hhmm = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`
const dayString = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// A partner's available slot as it falls for this person: the real dates and local times it covers.
function describeSlot(slot, timeZone) {
  const start = slotOccurrenceUtcInstant(slot, slot.start_time.slice(0, 5), timeZone)
  const end = slotOccurrenceUtcInstant(slot, slot.end_time.slice(0, 5), timeZone)
  return { slot, start, end, from: hhmm(start), to: hhmm(end), lastStart: timeStrPlusMinutes(hhmm(end), -SESSION_MINUTES) }
}

export default function SendSessionRequestModal({ lockedPartnerId, onClose, onSent }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const language = user?.profile?.learning_language || ''
  const [partners, setPartners] = useState([])
  const [partnersLoading, setPartnersLoading] = useState(true)
  const [partnerId, setPartnerId] = useState(lockedPartnerId || '')
  const [partnerDetail, setPartnerDetail] = useState(null)
  const [slotId, setSlotId] = useState(null)
  const [startTime, setStartTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const lockedFromPartner = Boolean(lockedPartnerId)

  useEffect(() => {
    if (lockedFromPartner) return
    setPartnersLoading(true)
    client.get('/matching/partners/', { params: language ? { language } : {} })
      .then(({ data }) => setPartners(data))
      .finally(() => setPartnersLoading(false))
  }, [language, lockedFromPartner])

  // The chosen partner's available times are the only times that can be asked for.
  useEffect(() => {
    setPartnerDetail(null)
    setSlotId(null)
    setStartTime('')
    if (!partnerId) return
    client.get(`/matching/partners/${partnerId}/`).then(({ data }) => setPartnerDetail(data)).catch(() => {})
  }, [partnerId])

  const options = useMemo(() => {
    if (!partnerDetail) return []
    return (partnerDetail.availability || [])
      .filter((slot) => !isSlotExpiredToday(slot))
      .map((slot) => describeSlot(slot, partnerDetail.timezone))
      .filter((o) => o.end > new Date())
      .sort((a, b) => a.start - b.start)
  }, [partnerDetail])

  const chosen = options.find((o) => o.slot.id === slotId) || null
  const dayLabel = (date) => date.toLocaleDateString(i18n.resolvedLanguage, { weekday: 'long', month: 'short', day: 'numeric' })
  const startHint = (o) => t('schedule.startBetween', { from: o.from, to: o.lastStart, defaultValue: 'Choose a start time between {{from}} and {{to}}.' })

  const pickSlot = (option) => {
    setSlotId(option.slot.id)
    setStartTime(option.from)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!partnerId || !chosen || !startTime) {
      setError(t('schedule.errorMissing'))
      return
    }
    if (startTime < chosen.from || startTime > chosen.lastStart) {
      setError(startHint(chosen))
      return
    }
    const startDateTime = new Date(`${dayString(chosen.start)}T${startTime}`)
    if (startDateTime <= new Date()) {
      setError(t('partners.pastTimeError'))
      return
    }
    const endDateTime = new Date(startDateTime.getTime() + SESSION_MINUTES * 60000)
    setSubmitting(true)
    try {
      await client.post('/sessions/', {
        partner_id: partnerId,
        duration_minutes: SESSION_MINUTES,
        notes,
        scheduled_time: startDateTime.toISOString(),
        window_end_time: endDateTime.toISOString(),
        // what the time is for was decided by the partner when they offered it
        session_type: chosen.slot.session_type || 'lesson',
        lesson: chosen.slot.session_type === 'conversation' ? null : chosen.slot.lesson || null,
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

  const typeBadge = (slot) => {
    const conversation = slot.session_type === 'conversation'
    const Icon = conversation ? MessagesSquare : BookOpen
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
        <Icon size={13} />
        {conversation
          ? t('partners.typeConversation', 'Free conversation')
          : `${t('partners.typeLesson', 'From the lessons')}${slot.lesson ? ` · ${t('partners.lessonOption', { n: slot.lesson })}` : ''}`}
      </span>
    )
  }

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
          <button type="submit" form="session-request-form" disabled={submitting || !chosen} className="lp-btn-primary flex-1 disabled:opacity-50">
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
          {lockedFromPartner ? (
            partnerDetail && (
              <p className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>
                <User size={16} style={{ color: 'var(--accent)' }} /> {partnerDetail.full_name}
              </p>
            )
          ) : (
            <ModalField
              label={`${t('schedule.partner')} *`}
              icon={User}
              hint={!partnersLoading && partners.length === 0 ? t('schedule.noPartnersForFilters') : undefined}
            >
              <select
                required
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className={`${modalInputClass} ps-11 ${partnersLoading ? 'cursor-not-allowed opacity-60' : ''}`}
                style={modalInputStyle}
                disabled={partnersLoading}
              >
                <option value="" disabled>{partnersLoading ? t('partners.loading') : t('schedule.selectAPartner')}</option>
                {partners.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
              </select>
            </ModalField>
          )}

          {partnerId && partnerDetail && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>
                {t('schedule.pickAvailableTime', 'Choose one of their available times')}
              </p>
              {options.length === 0 ? (
                <p className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
                  {t('schedule.noAvailability', 'This partner has no available times right now.')}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {options.map((o) => {
                    const active = o.slot.id === slotId
                    return (
                      <button
                        key={o.slot.id}
                        type="button"
                        onClick={() => pickSlot(o)}
                        className="rounded-2xl p-3.5 text-start transition-all"
                        style={active
                          ? { background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', border: '2px solid var(--accent)' }
                          : { background: 'var(--surface)', border: '2px solid var(--line)' }}
                      >
                        <span className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>
                          <CalendarCheck size={15} style={{ color: 'var(--accent)' }} /> {dayLabel(o.start)}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
                          <Clock size={14} /> {o.from}–{o.to}
                        </span>
                        <span className="mt-1.5 block">{typeBadge(o.slot)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {chosen && (
            <div className="rounded-2xl p-4" style={{ background: 'color-mix(in srgb, var(--accent) 8%, var(--surface))', border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))' }}>
              <ModalField label={`${t('schedule.chooseStart', 'Start time')} *`} icon={Clock} hint={startHint(chosen)}>
                <input
                  required
                  type="time"
                  min={chosen.from}
                  max={chosen.lastStart}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`${modalInputClass} ps-11`}
                  style={modalInputStyle}
                />
              </ModalField>
              <p className="mt-3 text-xs font-semibold" style={{ color: 'var(--ink-soft)' }}>
                {dayLabel(chosen.start)} · {SESSION_MINUTES} min
                {startTime && ` · ${startTime}–${timeStrPlusMinutes(startTime, SESSION_MINUTES)}`}
              </p>
            </div>
          )}

          <ModalField label={t('schedule.notes')}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
