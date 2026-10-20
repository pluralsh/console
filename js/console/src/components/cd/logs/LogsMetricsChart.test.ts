import { describe, expect, it } from 'vitest'
import { bucketSizeForWindow } from './LogsMetricsChart'

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
