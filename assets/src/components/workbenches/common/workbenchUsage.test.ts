import { describe, expect, it } from 'vitest'
import { formatTokenCost, formatTokenCount } from './workbenchUsage'

describe('workbench usage formatting', () => {
  it('formats token counts compactly', () => {
    expect(formatTokenCount(995_000)).toBe('995K')
    expect(formatTokenCount(2_800_000)).toBe('2.8M')
    expect(formatTokenCount(3_000_000)).toBe('3M')
  })

  it('formats token cost with two decimals', () => {
    expect(formatTokenCost(9.37)).toBe('$9.37')
    expect(formatTokenCost(10)).toBe('$10.00')
  })

  it('does not format missing usage values', () => {
    expect(formatTokenCount(null)).toBeUndefined()
    expect(formatTokenCost(undefined)).toBeUndefined()
  })
})
