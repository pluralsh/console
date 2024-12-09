import moment from 'moment'

const DATE_PATTERN = 'h:mm a'

export function dateTimeFormat(date: string | Date) {
  if (!date) return null

  if (moment(date).isSame(moment(), 'day'))
    return moment(date).format(DATE_PATTERN)

  return moment(date).format('MMM Do YYYY, h:mm a')
}

export function toDateOrUndef(d: unknown) {
  const date = new Date(d as any)

  return Number.isNaN(date.getTime()) ? undefined : date
}
