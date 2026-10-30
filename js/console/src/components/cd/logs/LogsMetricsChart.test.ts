import { describe, expect, it } from 'vitest'
import { LogLevel } from 'generated/graphql'
import { bucketSizeForWindow, stackBuckets } from './LogsMetricsChart'

describe('bucketSizeForWindow', () => {
  it('keeps the histogram within ~90 bars', () => {
    expect(bucketSizeForWindow(60)).toBe('1s')
    expect(bucketSizeForWindow(15 * 60)).toBe('15s')
    expect(bucketSizeForWindow(60 * 60)).toBe('1m')
    expect(bucketSizeForWindow(4 * 60 * 60)).toBe('5m')
    expect(bucketSizeForWindow(24 * 60 * 60)).toBe('30m')
    expect(bucketSizeForWindow(7 * 24 * 60 * 60)).toBe('3h')
  })

  it('caps at the largest bucket for very long windows', () => {
    expect(bucketSizeForWindow(90 * 24 * 60 * 60)).toBe('6h')
  })
})

describe('stackBuckets', () => {
  it('stacks levels per timestamp, most severe first', () => {
    const [first, second] = stackBuckets([
      { timestamp: '2026-10-01T00:01:00Z', count: 2, level: LogLevel.Info },
      { timestamp: '2026-10-01T00:00:00Z', count: 3, level: LogLevel.Info },
      { timestamp: '2026-10-01T00:00:00Z', count: 1, level: LogLevel.Error },
      { timestamp: '2026-10-01T00:00:00Z', count: 0, level: LogLevel.Warn },
    ])

    expect(first.timestamp.toISOString()).toBe('2026-10-01T00:00:00.000Z')
    expect(first.count).toBe(4)
    expect(first.levels).toEqual([
      { level: LogLevel.Error, count: 1 },
      { level: LogLevel.Info, count: 3 },
    ])
    expect(second.count).toBe(2)
  })

  it('treats buckets without a level as unknown', () => {
    const [bucket] = stackBuckets([
      { timestamp: '2026-10-01T00:00:00Z', count: 5, level: null },
    ])
    expect(bucket.levels).toEqual([{ level: LogLevel.Unknown, count: 5 }])
  })
})
