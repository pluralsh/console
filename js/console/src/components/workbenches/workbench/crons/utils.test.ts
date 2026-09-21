import { CronExpressionParser } from 'cron-parser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCronPreview,
  cronToExplanation,
  describeCronExpression,
  formatPreviewTimestamp,
  parseCronExpression,
  validateCronExpression,
} from './utils'

describe('workbench cron parser bindings', () => {
  it('uses the named CronExpressionParser export, not the CJS module object', () => {
    expect(typeof CronExpressionParser.parse).toBe('function')
    expect(() => parseCronExpression('0 12 * * *')).not.toThrow()
  })

  it('still describes expressions through cronstrue', () => {
    expect(describeCronExpression('0 12 * * *')).toMatch(/12:00/i)
  })
})

describe('validateCronExpression', () => {
  it('accepts standard 5-field unix cron expressions', () => {
    expect(validateCronExpression('0 12 * * *')).toBe(true)
    expect(validateCronExpression('*/5 * * * *')).toBe(true)
    expect(validateCronExpression('0 9 * * 1-5')).toBe(true)
  })

  it('accepts 6-field expressions and documented shortcuts', () => {
    expect(validateCronExpression('0 0 12 * * *')).toBe(true)
    expect(validateCronExpression('@hourly')).toBe(true)
    expect(validateCronExpression('@daily')).toBe(true)
    expect(validateCronExpression('@weekdays')).toBe(true)
  })

  it('rejects malformed expressions', () => {
    expect(validateCronExpression('not a cron')).toBe(false)
    expect(validateCronExpression('0 12 * * * * *')).toBe(false)
    expect(validateCronExpression('')).toBe(false)
    expect(validateCronExpression('   ')).toBe(false)
  })
})

describe('buildCronPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-20T10:43:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('previews a daily noon schedule in UTC', () => {
    const preview = buildCronPreview('0 12 * * *')

    expect(preview.description).toMatch(/12:00/i)
    expect(preview.nextTimes).toEqual([
      '2026-09-20 12:00:00 UTC',
      '2026-09-21 12:00:00 UTC',
      '2026-09-22 12:00:00 UTC',
    ])
  })

  it('does not report a valid expression as invalid', () => {
    expect(buildCronPreview('0 12 * * *').description).not.toBe(
      'Invalid cron expression'
    )
  })

  it('reports invalid expressions without next times', () => {
    expect(buildCronPreview('not a cron')).toEqual({
      description: 'Invalid cron expression',
      nextTimes: [],
    })
  })
})

describe('cronToExplanation', () => {
  it('falls back when no crontab is set', () => {
    expect(cronToExplanation({})).toBe('Next run not scheduled yet')
  })

  it('describes a valid crontab', () => {
    expect(cronToExplanation({ crontab: '0 12 * * *' })).toMatch(/12:00/i)
  })
})

describe('formatPreviewTimestamp', () => {
  it('splits a UTC preview timestamp into parts', () => {
    expect(formatPreviewTimestamp('2026-09-20 12:00:00 UTC')).toEqual({
      datePart: '2026-09-20',
      hourPart: '12:00:00',
      zonePart: 'UTC',
    })
  })

  it('returns null for unexpected shapes', () => {
    expect(formatPreviewTimestamp('2026-09-20T12:00:00Z')).toBeNull()
  })
})
