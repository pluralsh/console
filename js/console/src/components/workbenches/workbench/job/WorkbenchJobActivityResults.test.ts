import { describe, expect, it } from 'vitest'
import { WorkbenchJobActivityMetricFragment } from 'generated/graphql'
import { getMetricSeries } from './WorkbenchJobActivityResults'

function metric(
  overrides: Partial<WorkbenchJobActivityMetricFragment>
): WorkbenchJobActivityMetricFragment {
  return {
    name: 'requests',
    timestamp: '2026-09-04T10:00:00Z',
    value: 1,
    ...overrides,
  }
}

describe('getMetricSeries', () => {
  it('uses the chart series identifiers and order for labeled legend entries', () => {
    const series = getMetricSeries([
      metric({ labels: { status: 'success' } }),
      metric({ labels: { status: 'success' }, value: 2 }),
      metric({ labels: { status: 'error' }, value: 3 }),
      metric({ name: 'cpu_usage', labels: null, value: 4 }),
    ])

    expect(series.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'requests{status:success}', label: 'status=success' },
      { id: 'requests{status:error}', label: 'status=error' },
      { id: 'cpu_usage{}', label: 'cpu_usage' },
    ])
    expect(series[0].data).toHaveLength(2)
  })

  it('treats differently ordered label maps as a single series', () => {
    const series = getMetricSeries([
      metric({ labels: { method: 'GET', status: 'success' } }),
      metric({ labels: { status: 'success', method: 'GET' }, value: 2 }),
    ])

    expect(series).toHaveLength(1)
    expect(series[0]).toMatchObject({
      id: 'requests{method:GET,status:success}',
      label: 'method=GET, status=success',
    })
  })
})
