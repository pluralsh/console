import { describe, expect, it } from 'vitest'
import {
  buildMonitoringShareUrl,
  parseMonitoringShareSearch,
} from './monitoringShare'

const HOUR = 60 * 60 * 1000

describe('monitoringShare', () => {
  it('round-trips multi-select values containing commas', () => {
    const url = buildMonitoringShareUrl({
      pathname: '/workbench/1/monitoring/dashboards/2',
      range: { live: true, durationMs: 24 * HOUR },
      variables: { region: ['us,east', 'prod'], env: 'staging' },
      includeFiltersAndRange: true,
    })

    const parsed = parseMonitoringShareSearch(new URL(url).search)

    expect(new URL(url).searchParams.get('range')).toBe('1d')
    expect(parsed.range).toEqual({ live: true, durationMs: 24 * HOUR })
    expect(parsed.variables).toEqual({
      region: ['us,east', 'prod'],
      env: 'staging',
    })
  })

  it('round-trips absolute ranges', () => {
    const range = {
      live: false as const,
      start: new Date('2026-10-03T09:26:00.000Z'),
      end: new Date('2026-10-03T13:26:00.000Z'),
    }
    const url = buildMonitoringShareUrl({
      pathname: '/workbench/1/monitoring/dashboards/2',
      range,
      includeFiltersAndRange: true,
    })

    expect(parseMonitoringShareSearch(new URL(url).search).range).toEqual(range)
  })

  it('encodes compound live durations without spaces', () => {
    const url = buildMonitoringShareUrl({
      pathname: '/d',
      range: { live: true, durationMs: 30 * HOUR },
      includeFiltersAndRange: true,
    })

    expect(new URL(url).searchParams.get('range')).toBe('1d6h')
    expect(parseMonitoringShareSearch(new URL(url).search).range).toEqual({
      live: true,
      durationMs: 30 * HOUR,
    })
  })

  it('omits filters and range when not included', () => {
    const url = buildMonitoringShareUrl({
      pathname: '/workbench/1/monitoring/dashboards/2',
      range: { live: true, durationMs: 24 * HOUR },
      variables: { region: ['a', 'b'] },
      includeFiltersAndRange: false,
    })

    const parsed = parseMonitoringShareSearch(new URL(url).search)

    expect(parsed.range).toBeUndefined()
    expect(parsed.variables).toEqual({})
  })

  it('accepts legacy preset ranges and ignores invalid ones', () => {
    expect(parseMonitoringShareSearch('?range=7d').range).toEqual({
      live: true,
      durationMs: 7 * 24 * HOUR,
    })
    expect(parseMonitoringShareSearch('?range=1y').range).toBeUndefined()
    expect(
      parseMonitoringShareSearch(
        '?from=2026-10-03T10:00:00Z&to=2026-10-03T09:00:00Z'
      ).range
    ).toBeUndefined()
  })
})
