import { DEFAULT_TIME_RANGE } from 'components/utils/timerange/timeRange'
import { describe, expect, it } from 'vitest'
import {
  definedJobTimeRange,
  toolArgsTimeWindow,
  withToolTimeWindow,
} from './workbenchJobTimeRange'

const args = (start: string, end: string) => ({
  query: 'up',
  time_range: { start, end },
})

describe('definedJobTimeRange', () => {
  it('spans every query time range', () => {
    expect(
      definedJobTimeRange([
        args('2026-10-19T20:00:00Z', '2026-10-19T20:08:00Z'),
        { query: 'no range' },
        args('2026-10-19T19:30:00Z', '2026-10-19T20:05:00Z'),
      ])
    ).toEqual({
      live: false,
      start: new Date('2026-10-19T19:30:00Z'),
      end: new Date('2026-10-19T20:08:00Z'),
    })
  })

  it('falls back to the default range without valid time ranges', () => {
    expect(
      definedJobTimeRange([
        { query: 'up' },
        args('not a date', '2026-10-19T20:08:00Z'),
        null,
      ])
    ).toEqual(DEFAULT_TIME_RANGE)
  })
})

describe('withToolTimeWindow', () => {
  it('replaces the time range and keeps other args', () => {
    const window = {
      start: new Date('2026-10-18T00:00:00Z'),
      end: new Date('2026-10-19T00:00:00Z'),
    }
    const next = withToolTimeWindow(
      args('2026-10-19T20:00:00Z', '2026-10-19T20:08:00Z'),
      window
    )
    expect(next?.query).toBe('up')
    expect(toolArgsTimeWindow(next)).toEqual(window)
  })

  it('leaves args untouched without a window', () => {
    const original = args('2026-10-19T20:00:00Z', '2026-10-19T20:08:00Z')
    expect(withToolTimeWindow(original, null)).toBe(original)
  })
})
