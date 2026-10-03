import { describe, expect, it } from 'vitest'
import {
  absoluteRange,
  formatDurationLong,
  formatDurationShort,
  formatRangeText,
  parseRangeText,
  rangeWindow,
} from './dashboardTimeRange'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const NOW = new Date(2026, 9, 3, 13, 26)

describe('parseRangeText', () => {
  it('parses durations as live ranges', () => {
    expect(parseRangeText('4h', NOW)).toEqual({
      live: true,
      durationMs: 4 * HOUR,
    })
    expect(parseRangeText('15m', NOW)).toEqual({
      live: true,
      durationMs: 15 * MINUTE,
    })
    expect(parseRangeText('past 3 days', NOW)).toEqual({
      live: true,
      durationMs: 3 * DAY,
    })
    expect(parseRangeText('Last 2 Hours', NOW)).toEqual({
      live: true,
      durationMs: 2 * HOUR,
    })
    expect(parseRangeText('1w', NOW)).toEqual({
      live: true,
      durationMs: 7 * DAY,
    })
    expect(parseRangeText('0h', NOW)).toBeNull()
    expect(parseRangeText('4 parsecs', NOW)).toBeNull()
  })

  it('parses absolute ranges with dates and times', () => {
    expect(parseRangeText('Oct 3, 9:26 am – Oct 3, 1:26 pm', NOW)).toEqual({
      live: false,
      start: new Date(2026, 9, 3, 9, 26),
      end: new Date(2026, 9, 3, 13, 26),
    })
    expect(parseRangeText('oct 1 10:00 to oct 2 10:00', NOW)).toEqual({
      live: false,
      start: new Date(2026, 9, 1, 10),
      end: new Date(2026, 9, 2, 10),
    })
    expect(parseRangeText('2026-10-01 08:00 - 2026-10-01 09:30', NOW)).toEqual({
      live: false,
      start: new Date(2026, 9, 1, 8),
      end: new Date(2026, 9, 1, 9, 30),
    })
    expect(parseRangeText('Sep 30, 2025 – Oct 2, 2025', NOW)).toEqual({
      live: false,
      start: new Date(2025, 8, 30),
      end: new Date(2025, 9, 2),
    })
  })

  it('borrows the date from the other side when one side is a bare time', () => {
    expect(parseRangeText('Oct 1, 9:00 am – 5pm', NOW)).toEqual({
      live: false,
      start: new Date(2026, 9, 1, 9),
      end: new Date(2026, 9, 1, 17),
    })
    expect(parseRangeText('9:00 – 11:30', NOW)).toEqual({
      live: false,
      start: new Date(2026, 9, 3, 9),
      end: new Date(2026, 9, 3, 11, 30),
    })
  })

  it('rejects garbage and inverted ranges', () => {
    expect(parseRangeText('', NOW)).toBeNull()
    expect(parseRangeText('yesterday-ish', NOW)).toBeNull()
    expect(parseRangeText('Oct 3, 1:26 pm – Oct 3, 9:26 am', NOW)).toBeNull()
    expect(parseRangeText('Oct 3 – Oct 4 – Oct 5', NOW)).toBeNull()
  })

  it('round-trips formatted ranges', () => {
    const ranges = [
      {
        live: false as const,
        start: new Date(2026, 9, 3, 9, 26),
        end: new Date(2026, 9, 3, 13, 26),
      },
      {
        live: false as const,
        start: new Date(2026, 8, 28, 22, 5),
        end: new Date(2026, 9, 2, 1, 0),
      },
      {
        live: false as const,
        start: new Date(2025, 11, 31, 23, 0),
        end: new Date(2026, 0, 1, 2, 0),
      },
      { live: true as const, durationMs: 4 * HOUR },
      { live: true as const, durationMs: 90 * MINUTE },
    ]
    for (const range of ranges)
      expect(parseRangeText(formatRangeText(range, NOW), NOW)).toEqual(range)
  })
})

describe('formatting', () => {
  it('formats short durations', () => {
    expect(formatDurationShort(4 * HOUR)).toBe('4h')
    expect(formatDurationShort(7 * DAY)).toBe('1w')
    expect(formatDurationShort(30 * DAY)).toBe('1mo')
    expect(formatDurationShort(DAY + 6 * HOUR)).toBe('1d 6h')
    expect(formatDurationShort(90 * MINUTE)).toBe('1h 30m')
    expect(formatDurationShort(15 * MINUTE)).toBe('15m')
  })

  it('formats long durations', () => {
    expect(formatDurationLong(4 * HOUR)).toBe('Past 4 hours')
    expect(formatDurationLong(3 * HOUR)).toBe('Past 3 hours')
    expect(formatDurationLong(MINUTE)).toBe('Past 1 minute')
    expect(formatDurationLong(90 * MINUTE)).toBe('Past 90 minutes')
  })

  it('collapses same-day ranges', () => {
    expect(
      formatRangeText(
        {
          live: false,
          start: new Date(2026, 9, 3, 9, 26),
          end: new Date(2026, 9, 3, 13, 26),
        },
        NOW
      )
    ).toBe('Oct 3, 9:26 am – 1:26 pm')
  })
})

describe('window helpers', () => {
  it('derives live windows from now', () => {
    expect(rangeWindow({ live: true, durationMs: HOUR }, NOW)).toEqual({
      start: new Date(NOW.getTime() - HOUR),
      end: NOW,
    })
  })

  it('normalizes drag selections', () => {
    expect(absoluteRange(new Date(2000), new Date(1000))).toEqual({
      live: false,
      start: new Date(1000),
      end: new Date(1000 + MINUTE),
    })
  })
})
