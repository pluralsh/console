const HOUR = 60 * 60
const DAY = 24 * HOUR

export const DURATIONS = [
  {
    offset: HOUR, step: '2m', label: '1H', tick: 'every 10 minutes',
  },
  {
    offset: 2 * HOUR, step: '4m', label: '2H', tick: 'every 20 minutes',
  },
  {
    offset: 6 * HOUR, step: '10m', label: '6H', tick: 'every 30 minutes',
  },
  {
    offset: DAY, step: '20m', label: '1D', tick: 'every 2 hours',
  },
  {
    offset: 7 * DAY, step: '1h', label: '7D', tick: 'every 12 hours',
  },
]
