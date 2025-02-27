import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isBetweenPlugin from 'dayjs/plugin/isBetween'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'
import utc from 'dayjs/plugin/utc'

export type DateParam = dayjs.ConfigType

// Time constants
export const MINUTE_TO_SECONDS = 60
export const HOUR_TO_SECONDS = MINUTE_TO_SECONDS * 60
export const DAY_TO_SECONDS = HOUR_TO_SECONDS * 24

// Duration presets for graphs/charts
export const DURATIONS = [
  {
    offset: HOUR_TO_SECONDS,
    step: '2m',
    label: '1H',
    tick: 'every 10 minutes',
  },
  {
    offset: 2 * HOUR_TO_SECONDS,
    step: '4m',
    label: '2H',
    tick: 'every 20 minutes',
  },
  {
    offset: 6 * HOUR_TO_SECONDS,
    step: '10m',
    label: '6H',
    tick: 'every 30 minutes',
  },
  {
    offset: DAY_TO_SECONDS,
    step: '20m',
    label: '1D',
    tick: 'every 2 hours',
  },
  {
    offset: 7 * DAY_TO_SECONDS,
    step: '1h',
    label: '7D',
    tick: 'every 12 hours',
  },
] as const

// base plugins first
dayjs.extend(customParseFormat)
dayjs.extend(updateLocale)

// dependent plugins
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(isBetweenPlugin)
dayjs.extend(localizedFormat)

// can decide later if we want to update this
// dayjs.updateLocale('en', {
//   relativeTime: {
//     future: 'in %s',
//     past: '%s ago',
//     s: '1 s',
//     ss: '%d s',
//     d: '1 d',
//     dd: '%dd',
//     m: '1 min',
//     mm: '%d min',
//     h: '1 h',
//     hh: '%d h',
//     M: '1 mo',
//     MM: '%d mo',
//     y: '1 y',
//     yy: '%d y',
//   },
// })

export { dayjs as dayjsExtended }

export const formatDateTime = (date: DateParam, pattern?: string) => {
  if (!date) return ''
  if (pattern) return dayjs(date).format(pattern)

  if (isSameDay(date)) return dayjs(date).format('h:mm a')

  return dayjs(date).format('MMM D, YYYY h:mm a')
}

export const toISOStringOrUndef = (date: DateParam, isUtc: boolean = false) => {
  if (!date) return undefined
  const dateObj = isUtc ? dayjs(date).utc(true) : dayjs(date)
  return dateObj.isValid() ? dateObj.toISOString() : undefined
}

export const isSameDay = (date: DateParam) =>
  date ? dayjs(date).isSame(dayjs(), 'day') : false

export const isBefore = (
  date: DateParam,
  compareDate: DateParam = new Date()
) => (date ? dayjs(date).isBefore(dayjs(compareDate)) : false)

export const isAfter = (
  date: DateParam,
  compareDate: DateParam = new Date()
) => (date ? dayjs(date).isAfter(dayjs(compareDate)) : false)

export const fromNow = (date: DateParam) => {
  if (!date) return ''
  return dayjs(date).fromNow()
}

export const toDateOrUndef = (d: unknown) => {
  if (!d) return undefined
  const date = new Date(d as any)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export const formatLocalizedDateTime = (date: DateParam) => {
  if (!date) return ''
  return dayjs(date).format('lll')
}

export const isValidDateTime = (
  date: DateParam,
  format?: string,
  strict: boolean = false
): boolean => {
  if (!date) return false
  return dayjs(date, format, strict).isValid()
}
