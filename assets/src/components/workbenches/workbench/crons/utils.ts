import CronExpressionParser from 'cron-parser'
import cronstrue from 'cronstrue'
import { dayjsExtended as dayjs, formatDateTime } from 'utils/datetime'

export const CRON_PLACEHOLDER = '*/5 * * * *'

export function cronToExplanation({
  crontab,
  nextRunAt,
}: {
  crontab?: string | null
  nextRunAt?: string | null
}) {
  const nextRunText = nextRunAt
    ? formatDateTime(nextRunAt, 'MMM D, YYYY [at] h:mm A')
    : null
  const fallback = `Next ${nextRunText ? `at ${nextRunText}` : 'run not scheduled yet'}`

  if (!crontab) return fallback

  try {
    const description = cronstrue.toString(crontab.trim(), {
      throwExceptionOnParseError: true,
    })

    return nextRunText ? `${description}, next at ${nextRunText}` : description
  } catch {
    return fallback
  }
}

export function buildCronPreview(expressionInput: string) {
  const expression = expressionInput.trim() || CRON_PLACEHOLDER

  try {
    const description = cronstrue.toString(expression, {
      throwExceptionOnParseError: true,
    })
    const nextTimes = getNextTriggerTimesUtc(expression, 3)

    return { description, nextTimes }
  } catch {
    return {
      description: 'Invalid cron expression',
      nextTimes: [] as string[],
    }
  }
}

function getNextTriggerTimesUtc(expression: string, count: number): string[] {
  const iterator = CronExpressionParser.parse(expression, {
    currentDate: new Date(),
    tz: 'UTC',
  })

  return Array.from({ length: count }, () => formatCronDateUtc(iterator.next()))
}

function formatCronDateUtc(value: { toISOString: () => string | null }) {
  const iso = value.toISOString()
  if (!iso) return ''
  return dayjs(iso).utc().format('YYYY-MM-DD HH:mm:ss [UTC]')
}

export function formatPreviewTimestamp(time: string): {
  datePart: string
  hourPart: string
  zonePart: string
} | null {
  const parts = time.split(' ')
  if (parts.length !== 3) return null

  const [datePart, hourPart, zonePart] = parts
  if (!datePart || !hourPart || !zonePart) return null

  return { datePart, hourPart, zonePart }
}

export function validateCronExpression(expression: string) {
  try {
    CronExpressionParser.parse(expression, {
      currentDate: new Date(),
      tz: 'UTC',
    })

    return true
  } catch {
    return false
  }
}
