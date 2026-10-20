import { describe, expect, it } from 'vitest'

import { thresholdYScale } from './thresholdScale'

describe('thresholdYScale', () => {
  it('extends flat data up to an out-of-range threshold', () => {
    const scale = thresholdYScale([0, 0, 0], 10, 0)
    expect(scale.min).toBe(0)
    expect(scale.max).toBeGreaterThan(10)
  })

  it('extends the lower bound for thresholds below the data', () => {
    const scale = thresholdYScale([50, 80], 10)
    expect(scale.min).toBeLessThan(10)
    expect(scale.max).toBeGreaterThan(80)
  })

  it('keeps a usable range when data and threshold are identical', () => {
    const scale = thresholdYScale([0, 0], 0)
    expect(scale.min).toBeLessThan(0)
    expect(scale.max).toBeGreaterThan(0)
  })

  it('pins the floor when no value goes below it', () => {
    expect(thresholdYScale([3, 7], 5, 0).min).toBe(0)
  })

  it('ignores non-finite values', () => {
    const scale = thresholdYScale([NaN, Infinity, 2], 4)
    expect(Number.isFinite(scale.min)).toBe(true)
    expect(Number.isFinite(scale.max)).toBe(true)
  })
})
