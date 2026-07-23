import { describe, expect, it } from 'vitest'
import { formatTokenCost, formatTokenCount } from './workbenchUsage'

describe('workbench usage formatting', () => {
  it('formats token counts below 1K as 1K', () => {
    expect(formatTokenCount(0)).toBe('0')
    expect(formatTokenCount(1)).toBe('1K')
    expect(formatTokenCount(500)).toBe('1K')
    expect(formatTokenCount(999)).toBe('1K')
  })

  it('formats token counts to whole K below 1M', () => {
    expect(formatTokenCount(1_000)).toBe('1K')
    expect(formatTokenCount(1_001)).toBe('1K')
    expect(formatTokenCount(1_100)).toBe('1K')
    expect(formatTokenCount(1_499)).toBe('1K')
    expect(formatTokenCount(1_500)).toBe('2K')
    expect(formatTokenCount(1_501)).toBe('2K')
    expect(formatTokenCount(1_600)).toBe('2K')
    expect(formatTokenCount(995_000)).toBe('995K')
  })

  it('promotes rounded 1000K to 1M near the million boundary', () => {
    expect(formatTokenCount(999_499)).toBe('999K')
    expect(formatTokenCount(999_500)).toBe('1M')
    expect(formatTokenCount(999_501)).toBe('1M')
    expect(formatTokenCount(999_999)).toBe('1M')
  })

  it('formats token counts with one decimal for M and bigger', () => {
    expect(formatTokenCount(1_000_000)).toBe('1M')
    expect(formatTokenCount(1_050_000)).toBe('1.1M')
    expect(formatTokenCount(1_100_000)).toBe('1.1M')
    expect(formatTokenCount(2_800_000)).toBe('2.8M')
    expect(formatTokenCount(3_000_000)).toBe('3M')
    expect(formatTokenCount(3_004_000)).toBe('3M')
    expect(formatTokenCount(3_050_000)).toBe('3.1M')
  })

  it('formats token counts with one decimal for B and bigger', () => {
    expect(formatTokenCount(1_000_000_000)).toBe('1B')
    expect(formatTokenCount(1_500_000_000)).toBe('1.5B')
  })

  it('formats token cost with two decimals', () => {
    expect(formatTokenCost(9.37)).toBe('$9.37')
    expect(formatTokenCost(10)).toBe('$10.00')
  })

  it('does not format missing usage values', () => {
    expect(formatTokenCount(null)).toBeUndefined()
    expect(formatTokenCost(undefined)).toBeUndefined()
  })

  it('does not format zero cost values', () => {
    expect(formatTokenCost(0)).toBeUndefined()
  })
})
