import { describe, expect, it } from 'vitest'
import {
  buildMonitoringShareUrl,
  parseMonitoringShareSearch,
} from './monitoringShare'

describe('monitoringShare', () => {
  it('round-trips multi-select values containing commas', () => {
    const url = buildMonitoringShareUrl({
      pathname: '/workbench/1/monitoring/dashboards/2',
      range: '1d',
      variables: { region: ['us,east', 'prod'], env: 'staging' },
      includeFiltersAndRange: true,
    })

    const parsed = parseMonitoringShareSearch(new URL(url).search)

    expect(parsed.range).toBe('1d')
    expect(parsed.variables).toEqual({
      region: ['us,east', 'prod'],
      env: 'staging',
    })
  })

  it('omits filters and range when not included', () => {
    const url = buildMonitoringShareUrl({
      pathname: '/workbench/1/monitoring/dashboards/2',
      range: '1d',
      variables: { region: ['a', 'b'] },
      includeFiltersAndRange: false,
    })

    const parsed = parseMonitoringShareSearch(new URL(url).search)

    expect(parsed.range).toBeUndefined()
    expect(parsed.variables).toEqual({})
  })
})
