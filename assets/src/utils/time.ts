import moment, { Moment } from 'moment'

export const MINUTE_TO_SECONDS = 60
export const HOUR_TO_SECONDS = MINUTE_TO_SECONDS * 60
export const DAY_TO_SECONDS = HOUR_TO_SECONDS * 24

export const SECOND_TO_MILLISECONDS = 1000
export const MINUTE_TO_MILLISECONDS = SECOND_TO_MILLISECONDS * 60

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
]

export const MOMENT_LOCALE_DEFAULT = 'en'
export const MOMENT_LOCALE_MIN_REL_TIME = 'en-min'

// Create custom locale for minimal relative time units
moment.defineLocale(MOMENT_LOCALE_MIN_REL_TIME, {
  parentLocale: MOMENT_LOCALE_DEFAULT,
  relativeTime: {
    s: '1 s',
    ss: '%d s',
    d: '1 d',
    dd: '%dd',
    m: '1 min',
    mm: '%d min',
    h: '1 h',
    hh: '%d h',
    M: '1 mo',
    MM: '%d mo',
    y: '1 y',
    yy: '%d y',
  },
})
// defineLocale() also sets global locale, so reset locale to default
moment.locale(MOMENT_LOCALE_DEFAULT)

export function fromNowMin(m: Moment, arg?: Parameters<Moment['fromNow']>[0]) {
  return m.locale(MOMENT_LOCALE_MIN_REL_TIME).fromNow(arg)
}
