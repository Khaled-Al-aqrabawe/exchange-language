import { TIMEZONES } from '../constants'

export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Prefer the browser's full IANA zone list (modern browsers); fall back to
// the curated list, adding the detected zone if it's missing from it.
export function timezoneOptions() {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      // fall through to curated list
    }
  }
  const detected = detectTimezone()
  return TIMEZONES.includes(detected) ? TIMEZONES : [detected, ...TIMEZONES]
}

// e.g. "GMT+3" -> "UTC+3". Falls back to '' if the runtime can't resolve an offset.
export function timezoneOffsetLabel(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date())
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value || ''
    return offset.replace('GMT', 'UTC')
  } catch {
    return ''
  }
}

// e.g. "Asia/Amman" -> "Asia/Amman (UTC+3)"
export function formatTimezoneOption(tz) {
  const offset = timezoneOffsetLabel(tz)
  return offset ? `${tz} (${offset})` : tz
}
