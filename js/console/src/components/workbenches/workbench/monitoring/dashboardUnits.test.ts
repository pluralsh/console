import { DashboardGraphUnit } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { formatUnitValue, yAxisWidth } from './dashboardUnits'

describe('dashboard units', () => {
  it('formats values compactly per unit', () => {
    expect(formatUnitValue(5600, DashboardGraphUnit.None)).toBe('5.6k')
    expect(formatUnitValue(950, null)).toBe('950')
    expect(formatUnitValue(0.123456, DashboardGraphUnit.None)).toBe('0.123')
    expect(formatUnitValue(512 * 1024 * 1024, DashboardGraphUnit.Bytes)).toBe(
      '512 MB'
    )
    expect(formatUnitValue(0.34, DashboardGraphUnit.Time)).toBe('340ms')
    expect(formatUnitValue(90, DashboardGraphUnit.Time)).toBe('1.5m')
    expect(formatUnitValue(0.00025, DashboardGraphUnit.Time)).toBe('250µs')
    expect(formatUnitValue(0.25, DashboardGraphUnit.Cpu)).toBe('250m')
    expect(formatUnitValue(1.5, DashboardGraphUnit.Cpu)).toBe('1.5')
    expect(formatUnitValue(42.5, DashboardGraphUnit.Percent)).toBe('42.5%')
  })

  it('sizes the y axis for its labels', () => {
    expect(yAxisWidth(0, 5000, DashboardGraphUnit.None)).toBeLessThan(
      yAxisWidth(0, 5.5 * 1024 ** 3, DashboardGraphUnit.Bytes)
    )
    expect(yAxisWidth(0, 10, null)).toBeGreaterThanOrEqual(32)
  })
})
