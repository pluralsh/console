export const MINUTE_TO_SECONDS = 60
export const HOUR_TO_SECONDS = MINUTE_TO_SECONDS * 60
export const DAY_TO_SECONDS = HOUR_TO_SECONDS * 24

export const SECOND_TO_MILLISECONDS = 1000
export const MINUTE_TO_MILLISECONDS = SECOND_TO_MILLISECONDS * 60

export const DURATIONS = [
  {
    offset: HOUR_TO_SECONDS, step: '2m', label: '1H', tick: 'every 10 minutes',
  },
  {
    offset: 2 * HOUR_TO_SECONDS, step: '4m', label: '2H', tick: 'every 20 minutes',
  },
  {
    offset: 6 * HOUR_TO_SECONDS, step: '10m', label: '6H', tick: 'every 30 minutes',
  },
  {
    offset: DAY_TO_SECONDS, step: '20m', label: '1D', tick: 'every 2 hours',
  },
  {
    offset: 7 * DAY_TO_SECONDS, step: '1h', label: '7D', tick: 'every 12 hours',
  },
]
