import { CronExpressionParser } from 'cron-parser'
import cronstrue from 'cronstrue'
import { dayjsExtended as dayjs, formatDateTime } from 'utils/datetime'

export const CRON_PLACEHOLDER = '*/5 * * * *'

const CRON_TZ = 'UTC'

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
    const description = describeCronExpression(crontab.trim())

    return nextRunText ? `${description}, next at ${nextRunText}` : description
  } catch {
    return fallback
  }
}

export function buildCronPreview(expressionInput: string) {
  const expression = expressionInput.trim() || CRON_PLACEHOLDER

  try {
    return {
      description: describeCronExpression(expression),
      nextTimes: getNextTriggerTimesUtc(expression, 3),
    }
  } catch {
    return {
      description: 'Invalid cron expression',
      nextTimes: [] as string[],
    }
  }
}

export function parseCronExpression(
  expression: string,
  currentDate: Date = new Date()
) {
  if (!expression.trim()) {
    throw new Error('Cron expression is empty')
  }

  if (typeof CronExpressionParser?.parse !== 'function') {
    throw new Error(
      'cron-parser named export CronExpressionParser.parse is missing; default CJS imports are the module object under Vite ESM interop'
    )
  }

  return CronExpressionParser.parse(expression, {
    currentDate,
    tz: CRON_TZ,
  })
}

export function describeCronExpression(expression: string) {
  if (typeof cronstrue?.toString !== 'function') {
    throw new Error('cronstrue.toString is missing')
  }

  return cronstrue.toString(expression, { throwExceptionOnParseError: true })
}

function getNextTriggerTimesUtc(expression: string, count: number): string[] {
  const iterator = parseCronExpression(expression)

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
    parseCronExpression(expression)
    return true
  } catch {
    return false
  }
}
