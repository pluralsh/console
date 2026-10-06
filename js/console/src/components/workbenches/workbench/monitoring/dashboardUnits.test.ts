import { DashboardGraphUnit } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { formatUnitValue, unitAxis, yAxisWidth } from './dashboardUnits'

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
    expect(formatUnitValue(340, DashboardGraphUnit.Milliseconds)).toBe('340ms')
    expect(formatUnitValue(5400, DashboardGraphUnit.Milliseconds)).toBe('5.4s')
    expect(formatUnitValue(0.25, DashboardGraphUnit.Milliseconds)).toBe('250µs')
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

  it('aligns millisecond axes to clock-friendly durations', () => {
    const axis = unitAxis(0, 5400, DashboardGraphUnit.Milliseconds)
    expect(axis.ticks.every((tick) => tick % 1000 === 0)).toBe(true)
    expect(axis.max).toBeGreaterThanOrEqual(5400)
    expect(unitAxis(0, 5.4, DashboardGraphUnit.Time).max).toBe(axis.max / 1000)
  })

  it('labels seconds and millisecond axes identically, without float noise', () => {
    const labels = (min: number, max: number, unit: DashboardGraphUnit) =>
      unitAxis(min, max, unit).ticks.map((tick) => formatUnitValue(tick, unit))

    // eg PromEx p99s in ms vs the same latencies from a *_seconds histogram
    for (const maxMs of [0.042, 0.7, 3.3, 35, 340, 999, 1001, 5400, 95_000]) {
      const seconds = labels(0, maxMs / 1000, DashboardGraphUnit.Time)
      expect(labels(0, maxMs, DashboardGraphUnit.Milliseconds)).toEqual(seconds)
      for (const label of seconds)
        expect(label).toMatch(/^\d+(\.\d+)?(µs|ms|s|m|h|d|ns)$/)
      for (const label of seconds) expect(label).not.toMatch(/\d{4,}/)
    }
    expect(labels(0, 0.35, DashboardGraphUnit.Time)).toEqual([
      '0s',
      '100ms',
      '200ms',
      '300ms',
      '400ms',
    ])
    expect(labels(0, 0.3, DashboardGraphUnit.Time).at(-1)).toBe('300ms')
  })
})
