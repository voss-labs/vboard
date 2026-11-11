const IST_OFFSET_MS = 330 * 60_000
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
]

type Parts = {
  year: number
  month: number
  day: number
  weekday: number
  hour: number
  minute: number
}

function campusParts(date: Date): Parts {
  const t = new Date(date.getTime() + IST_OFFSET_MS)
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth(),
    day: t.getUTCDate(),
    weekday: t.getUTCDay(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

function time(p: Parts) {
  const h = p.hour % 12 || 12
  return `${h}:${pad(p.minute)} ${p.hour < 12 ? "am" : "pm"}`
}

function shortDay(p: Parts) {
  return `${WEEKDAYS[p.weekday].slice(0, 3)}, ${p.day} ${MONTHS_SHORT[p.month]}`
}

function fullDate(p: Parts) {
  return `${WEEKDAYS[p.weekday]}, ${p.day} ${MONTHS[p.month]} ${p.year}`
}

export function campusDayKey(date: Date): string {
  const p = campusParts(date)
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`
}

export function isSameCampusDay(a: Date, b: Date): boolean {
  return campusDayKey(a) === campusDayKey(b)
}

export function formatEventDate(start: Date, end?: Date): string {
  const s = campusParts(start)
  if (!end) return `${shortDay(s)} · ${time(s)}`
  const e = campusParts(end)
  return isSameCampusDay(start, end)
    ? `${shortDay(s)} · ${time(s)}–${time(e)}`
    : `${shortDay(s)} → ${shortDay(e)}`
}

export function formatEventRange(
  start: Date,
  end?: Date
): { date: string; time: string } {
  const s = campusParts(start)
  if (!end) return { date: fullDate(s), time: time(s) }
  const e = campusParts(end)
  const sameDay = isSameCampusDay(start, end)
  return {
    date: sameDay ? fullDate(s) : `${fullDate(s)} – ${fullDate(e)}`,
    time: sameDay ? `${time(s)}–${time(e)}` : `${time(s)} → ${time(e)}`,
  }
}

export function formatShortDate(date: Date): string {
  const p = campusParts(date)
  return `${p.day} ${MONTHS_SHORT[p.month]}`
}

export function formatDay(date: Date): string {
  const p = campusParts(date)
  return `${p.day} ${MONTHS_SHORT[p.month]} ${p.year}`
}

export function formatStamp(date: Date): string {
  const p = campusParts(date)
  return `${p.day} ${MONTHS_SHORT[p.month]}, ${time(p)}`
}

export function bodyPreview(text: string, max = 180): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`
}

export function parseCampusDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(`${value}:00+05:30`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toCampusInputValue(date: Date | null | undefined): string {
  if (!date) return ""
  const p = campusParts(date)
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

export function campusCalendarDate(date: Date): Date {
  const p = campusParts(date)
  return new Date(p.year, p.month, p.day)
}

export function calendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatCalendarHeader(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`
}
