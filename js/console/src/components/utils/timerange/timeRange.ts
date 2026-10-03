import { dayjsExtended as dayjs, getMetricQueryStep } from 'utils/datetime'

export type TimeRange =
  { live: true; durationMs: number } | { live: false; start: Date; end: Date }

export type TimeWindow = { start: Date; end: Date }

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS
const MONTH_MS = 30 * DAY_MS

export const MIN_RANGE_MS = MINUTE_MS

export type TimeRangePreset = { durationMs: number; label: string }

export const TIME_RANGE_PRESETS: TimeRangePreset[] = [
  { durationMs: 15 * MINUTE_MS, label: 'Past 15 minutes' },
  { durationMs: HOUR_MS, label: 'Past 1 hour' },
  { durationMs: 4 * HOUR_MS, label: 'Past 4 hours' },
  { durationMs: DAY_MS, label: 'Past 1 day' },
  { durationMs: 2 * DAY_MS, label: 'Past 2 days' },
  { durationMs: 3 * DAY_MS, label: 'Past 3 days' },
  { durationMs: WEEK_MS, label: 'Past 7 days' },
  { durationMs: 15 * DAY_MS, label: 'Past 15 days' },
  { durationMs: MONTH_MS, label: 'Past 1 month' },
]

export const DEFAULT_TIME_RANGE: TimeRange = {
  live: true,
  durationMs: HOUR_MS,
}

const UNITS: { ms: number; short: string; long: string }[] = [
  { ms: WEEK_MS, short: 'w', long: 'week' },
  { ms: DAY_MS, short: 'd', long: 'day' },
  { ms: HOUR_MS, short: 'h', long: 'hour' },
  { ms: MINUTE_MS, short: 'm', long: 'minute' },
]

const UNIT_ALIASES: Record<string, number> = {
  m: MINUTE_MS,
  min: MINUTE_MS,
  mins: MINUTE_MS,
  minute: MINUTE_MS,
  minutes: MINUTE_MS,
  h: HOUR_MS,
  hr: HOUR_MS,
  hrs: HOUR_MS,
  hour: HOUR_MS,
  hours: HOUR_MS,
  d: DAY_MS,
  day: DAY_MS,
  days: DAY_MS,
  w: WEEK_MS,
  wk: WEEK_MS,
  wks: WEEK_MS,
  week: WEEK_MS,
  weeks: WEEK_MS,
  mo: MONTH_MS,
  mos: MONTH_MS,
  month: MONTH_MS,
  months: MONTH_MS,
}

const DURATION_PREFIX_RE = /^(?:last|past)\s+/
const DURATION_RE = /^(?:\d+\s*[a-z]+\s*)+$/
const DURATION_PART_RE = /(\d+)\s*([a-z]+)/g

/** Parses `4h`, `1h 30m`, `past 3 days`, or a bare unit like `hour`. */
export function parseDuration(text: string): number | null {
  const value = text.trim().toLowerCase().replace(DURATION_PREFIX_RE, '')
  if (UNIT_ALIASES[value]) return UNIT_ALIASES[value]
  if (!DURATION_RE.test(value)) return null

  let total = 0
  for (const [, count, unit] of value.matchAll(DURATION_PART_RE)) {
    const unitMs = UNIT_ALIASES[unit]
    if (!unitMs) return null
    total += Number(count) * unitMs
  }
  return total > 0 ? total : null
}

/** URL-safe duration, e.g. `4h` or `1d6h`. */
export function encodeDuration(ms: number) {
  return formatDurationShort(ms).replace(/\s/g, '')
}

/** Compact duration label using at most two units, e.g. `4h`, `1w`, `1d 6h`. */
export function formatDurationShort(ms: number) {
  const total = Math.max(Math.round(ms / MINUTE_MS), 1) * MINUTE_MS
  if (total % MONTH_MS === 0) return `${total / MONTH_MS}mo`
  if (total % WEEK_MS === 0) return `${total / WEEK_MS}w`
  const units = UNITS.filter((unit) => unit.ms !== WEEK_MS)
  const first = units.findIndex((unit) => total >= unit.ms)
  const major = units[first]
  const minor = units[first + 1]
  const majorCount = Math.floor(total / major.ms)
  const minorCount = minor
    ? Math.floor((total - majorCount * major.ms) / minor.ms)
    : 0
  return minorCount
    ? `${majorCount}${major.short} ${minorCount}${minor.short}`
    : `${majorCount}${major.short}`
}

export function formatDurationLong(ms: number) {
  const preset = TIME_RANGE_PRESETS.find((p) => p.durationMs === ms)
  if (preset) return preset.label
  if (ms % MONTH_MS === 0) return pluralize('Past', ms / MONTH_MS, 'month')
  const unit = UNITS.find((u) => ms % u.ms === 0)
  if (unit) return pluralize('Past', ms / unit.ms, unit.long)
  return `Past ${formatDurationShort(ms)}`
}

function pluralize(prefix: string, count: number, unit: string) {
  return `${prefix} ${count} ${unit}${count === 1 ? '' : 's'}`
}

export function rangeWindow(range: TimeRange, now: Date): TimeWindow {
  if (!range.live) return { start: range.start, end: range.end }
  return { start: new Date(now.getTime() - range.durationMs), end: now }
}

/** Prometheus range-query arguments covering `window`. */
export function metricsQueryWindow({ start, end }: TimeWindow) {
  return {
    start: start.toISOString(),
    stop: end.toISOString(),
    step: getMetricQueryStep((end.getTime() - start.getTime()) / 1000),
  }
}

export function rangeDurationMs(range: TimeRange) {
  return range.live
    ? range.durationMs
    : range.end.getTime() - range.start.getTime()
}

export function absoluteRange(start: Date, end: Date): TimeRange {
  const [from, to] = start <= end ? [start, end] : [end, start]
  const minEnd = from.getTime() + MIN_RANGE_MS
  return {
    live: false,
    start: from,
    end: to.getTime() < minEnd ? new Date(minEnd) : to,
  }
}

const RANGE_SEPARATOR_RE = /\s*[–—]\s*|\s+-\s+|\s+to\s+/i

type PointFormat = { format: string; hasDate: boolean; hasYear: boolean }
type ParsedPoint = { date: dayjs.Dayjs; hasDate: boolean; hasYear: boolean }

const TIME_FORMATS = [
  'h:mm:ss A',
  'h:mm A',
  'h A',
  'H:mm:ss',
  'H:mm',
  'HH:mm:ss',
  'HH:mm',
]
const DATES_WITH_YEAR = [
  'MMM D, YYYY',
  'MMM D YYYY',
  'MMMM D, YYYY',
  'MMMM D YYYY',
  'M/D/YYYY',
  'YYYY-MM-DD',
]
const DATES_WITHOUT_YEAR = ['MMM D', 'MMMM D', 'M/D']

const POINT_FORMATS: PointFormat[] = [
  ...pointFormats(DATES_WITH_YEAR, true, true),
  ...pointFormats(DATES_WITHOUT_YEAR, true, false),
  ...TIME_FORMATS.map((format) => ({ format, hasDate: false, hasYear: false })),
]

function pointFormats(dates: string[], hasDate: boolean, hasYear: boolean) {
  return dates.flatMap((date) => [
    ...TIME_FORMATS.flatMap((time) => [
      { format: `${date}, ${time}`, hasDate, hasYear },
      { format: `${date} ${time}`, hasDate, hasYear },
    ]),
    ...(date.startsWith('YYYY')
      ? TIME_FORMATS.map((time) => ({
          format: `${date}T${time}`,
          hasDate,
          hasYear,
        }))
      : []),
    { format: date, hasDate, hasYear },
  ])
}

// dayjs strict parsing is case-sensitive: months must be `Oct`, meridiems `PM`.
function normalizePoint(text: string) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(\d)t(\d)/, '$1T$2')
    .replace(/(\d)\s?([ap])\.?m\.?$/, (_, d, p) => `${d} ${p.toUpperCase()}M`)
    .replace(/\b([a-z])([a-z]{2,})\b/g, (_, a, rest) => a.toUpperCase() + rest)
}

function parsePoint(text: string, now: Date): ParsedPoint | null {
  const value = normalizePoint(text)
  if (!value) return null

  for (const { format, hasDate, hasYear } of POINT_FORMATS) {
    const parsed = dayjs(value, format, true)
    if (!parsed.isValid()) continue
    let date = parsed
    if (!hasDate) {
      date = dayjs(now)
        .hour(parsed.hour())
        .minute(parsed.minute())
        .second(parsed.second())
        .millisecond(0)
    } else if (!hasYear) {
      date = date.year(now.getFullYear())
    }
    return { date, hasDate, hasYear }
  }

  const iso = dayjs(text.trim())
  if (/^\d{4}-\d{2}-\d{2}T/.test(text.trim()) && iso.isValid())
    return { date: iso, hasDate: true, hasYear: true }

  return null
}

/**
 * Parses free text typed into the range input. Accepts durations (`4h`,
 * `past 3 days`) as live ranges and `<start> – <end>` as absolute ranges.
 * A side without a date borrows the other side's date (or today).
 */
export function parseRangeText(text: string, now: Date): TimeRange | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const durationMs = parseDuration(trimmed)
  if (durationMs !== null) return { live: true, durationMs }

  const parts = trimmed.split(RANGE_SEPARATOR_RE)
  if (parts.length !== 2) return null

  const start = parsePoint(parts[0], now)
  const end = parsePoint(parts[1], now)
  if (!start || !end) return null

  let startDate = start.date
  let endDate = end.date
  if (!end.hasDate && start.hasDate)
    endDate = start.date
      .hour(end.date.hour())
      .minute(end.date.minute())
      .second(end.date.second())
  else if (!start.hasDate && end.hasDate)
    startDate = end.date
      .hour(start.date.hour())
      .minute(start.date.minute())
      .second(start.date.second())
  else if (start.hasDate && end.hasDate && start.hasYear !== end.hasYear) {
    const year = start.hasYear ? start.date.year() : end.date.year()
    startDate = startDate.year(year)
    endDate = endDate.year(year)
  }

  if (!endDate.isAfter(startDate)) return null
  return {
    live: false,
    start: startDate.toDate(),
    end: endDate.toDate(),
  }
}

export function formatRangeText(range: TimeRange, now: Date) {
  if (range.live) return formatDurationLong(range.durationMs)
  const start = dayjs(range.start)
  const end = dayjs(range.end)
  const thisYear = now.getFullYear()
  const dateFormat =
    start.year() === thisYear && end.year() === thisYear
      ? 'MMM D'
      : 'MMM D, YYYY'
  const timeFormat = (d: dayjs.Dayjs) =>
    d.second() === 0 ? 'h:mm a' : 'h:mm:ss a'
  const startText = start.format(`${dateFormat}, ${timeFormat(start)}`)
  const endText = end.isSame(start, 'day')
    ? end.format(timeFormat(end))
    : end.format(`${dateFormat}, ${timeFormat(end)}`)
  return `${startText} – ${endText}`
}

export function startOfCurrentMinute() {
  const now = new Date()
  now.setSeconds(0, 0)
  return now
}
