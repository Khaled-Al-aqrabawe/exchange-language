export const DAYS = [
  { value: 0, key: 'monday' },
  { value: 1, key: 'tuesday' },
  { value: 2, key: 'wednesday' },
  { value: 3, key: 'thursday' },
  { value: 4, key: 'friday' },
  { value: 5, key: 'saturday' },
  { value: 6, key: 'sunday' },
]

const INTL_WEEKDAY_TO_DAY_OF_WEEK = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

// JS Date#getDay() is 0=Sunday..6=Saturday; our AvailabilitySlot.day_of_week is 0=Monday..6=Sunday.
export function dateToDayOfWeek(dateStr) {
  const jsDay = new Date(`${dateStr}T00:00:00`).getDay()
  return (jsDay + 6) % 7
}

export const todayStr = () => new Date().toISOString().slice(0, 10)
export const nowTimeStr = () => new Date().toTimeString().slice(0, 5)

// 'HH:mm' (or 'HH:mm:ss') as a 12-hour clock time, e.g. '16:30' -> '4:30 PM'.
export function formatTime12(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.slice(0, 5).split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function timeStrPlusMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Returns { dayOfWeek: 0-6 (Mon=0), time: 'HH:mm' } for `date` as seen in `timeZone`.
export function localPartsInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const hour = map.hour === '24' ? '00' : map.hour
  return { dayOfWeek: INTL_WEEKDAY_TO_DAY_OF_WEEK[map.weekday], time: `${hour}:${map.minute}` }
}

// `slots` are AvailabilitySlot objects ({day_of_week, start_time, end_time}) in the
// partner's own timezone; `date` is a JS Date (any timezone) to check against it.
export function isWithinAvailability(date, timeZone, slots) {
  if (!slots || slots.length === 0) return true
  const { dayOfWeek, time } = localPartsInTimezone(date, timeZone)
  return slots.some((s) => s.day_of_week === dayOfWeek && time >= s.start_time.slice(0, 5) && time <= s.end_time.slice(0, 5))
}

// AvailabilitySlot.day_of_week is a recurring weekly weekday (0=Monday..6=Sunday).
// Returns the next calendar Date (today or later) that falls on that weekday. When
// `startTime` ('HH:mm') is given and today is a match, but that time has already
// passed, rolls forward to next week's occurrence instead of showing a past time as
// if it were still available today.
export function nextDateForDayOfWeek(dayOfWeek, startTime) {
  const today = new Date()
  const todayDow = (today.getDay() + 6) % 7
  let delta = (dayOfWeek - todayDow + 7) % 7
  if (delta === 0 && startTime) {
    const [h, m] = startTime.slice(0, 5).split(':').map(Number)
    const nowMinutes = today.getHours() * 60 + today.getMinutes()
    if (h * 60 + m <= nowMinutes) delta = 7
  }
  const result = new Date(today)
  result.setDate(today.getDate() + delta)
  return result
}

// True when `slot` has already happened and won't recur, so it shouldn't be shown
// as bookable anymore: for a one-time slot, once its date+end time has passed; for
// a recurring slot, only for the rest of today once its end time has passed (it
// reappears next week).
export function isSlotExpiredToday(slot) {
  const now = new Date()
  if (!slot.is_recurring && slot.specific_date) {
    const [eh, em] = slot.end_time.slice(0, 5).split(':').map(Number)
    const end = new Date(`${slot.specific_date}T00:00:00`)
    end.setHours(eh, em, 0, 0)
    return end <= now
  }
  const todayDow = (now.getDay() + 6) % 7
  if (slot.day_of_week !== todayDow) return false
  const [eh, em] = slot.end_time.slice(0, 5).split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return eh * 60 + em <= nowMinutes
}

// Converts a wall-clock date+time as seen in `timeZone` into the equivalent UTC Date instant.
export function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const guess = new Date(`${dateStr}T${timeStr}:00Z`)
  const asTz = new Date(guess.toLocaleString('en-US', { timeZone }))
  const asUtc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }))
  return new Date(guess.getTime() + (asUtc.getTime() - asTz.getTime()))
}

// Formats a Date using its browser-local components, matching the format
// expected by <input type="datetime-local">.
export function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Builds the next-occurrence UTC instant for a given weekday + 'HH:mm' wall-clock time in `timeZone`.
export function nextOccurrenceUtcInstant(dayOfWeek, timeStr, timeZone) {
  const date = nextDateForDayOfWeek(dayOfWeek, timeStr)
  const pad = (n) => String(n).padStart(2, '0')
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return zonedTimeToUtc(dateStr, timeStr, timeZone)
}

// Builds the next-occurrence UTC instant for a partner's recurring AvailabilitySlot.
export function nextSlotUtcInstant(slot, timeZone) {
  return nextOccurrenceUtcInstant(slot.day_of_week, slot.start_time.slice(0, 5), timeZone)
}

// Builds the booking UTC instant for a slot at the given 'HH:mm' start time - the
// slot's fixed `specific_date` if it's one-time, or the next weekly occurrence.
export function slotOccurrenceUtcInstant(slot, timeStr, timeZone) {
  if (!slot.is_recurring && slot.specific_date) {
    return zonedTimeToUtc(slot.specific_date, timeStr, timeZone)
  }
  return nextOccurrenceUtcInstant(slot.day_of_week, timeStr, timeZone)
}

// Splits an AvailabilitySlot into selectable session start times ('HH:mm') of
// `durationMinutes` each, spaced `incrementMinutes` apart, all fully inside the slot.
export function bookableStartTimes(slot, durationMinutes = 40, incrementMinutes = 20) {
  const [sh, sm] = slot.start_time.slice(0, 5).split(':').map(Number)
  const [eh, em] = slot.end_time.slice(0, 5).split(':').map(Number)
  const startTotal = sh * 60 + sm
  const endTotal = eh * 60 + em
  const options = []
  for (let t = startTotal; t + durationMinutes <= endTotal; t += incrementMinutes) {
    options.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)
  }
  if (options.length === 0) options.push(slot.start_time.slice(0, 5))
  return options
}
