import moment from 'moment'

export const Level = {
  ERROR: 'e',
  INFO: 'i',
  WARN: 'w',
  OTHER: 'o',
  FATAL: 'f',
}

export const ts = (timestamp) =>
  moment(new Date(Math.round(parseInt(timestamp) / (1000 * 1000)))).format()
