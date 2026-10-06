import { describe, expect, it } from 'vitest'
import { WorkbenchJobActivityMetricFragment } from 'generated/graphql'
import { getMetricSeries } from './workbenchJobMetrics'

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

describe('getMetricSeries short labels', () => {
  const shortLabels = (metrics: WorkbenchJobActivityMetricFragment[]) =>
    getMetricSeries(metrics).map(({ shortLabel }) => shortLabel)

  it('drops tags shared by every series', () => {
    expect(
      shortLabels([
        metric({ labels: { job: 'api', namespace: 'prod', status: '200' } }),
        metric({ labels: { job: 'api', namespace: 'prod', status: '500' } }),
      ])
    ).toEqual(['status=200', 'status=500'])
  })

  it('keeps the three most distinguishing tags and marks the rest as truncated', () => {
    const labels = (i: number) => ({
      cluster: 'east',
      code: String(200 + (i % 2)),
      method: ['GET', 'PUT', 'POST'][i % 3],
      pod: `api-${i}`,
      route: `/r${i % 4}`,
      zone: `z${i}`,
    })

    expect(
      shortLabels([0, 1, 2, 3, 4, 5].map((i) => metric({ labels: labels(i) })))
    ).toEqual([
      'pod=api-0, zone=z0, route=/r0, …',
      'pod=api-1, zone=z1, route=/r1, …',
      'pod=api-2, zone=z2, route=/r2, …',
      'pod=api-3, zone=z3, route=/r3, …',
      'pod=api-4, zone=z4, route=/r0, …',
      'pod=api-5, zone=z5, route=/r1, …',
    ])
  })

  it('treats a missing tag as a distinguishing value', () => {
    expect(
      shortLabels([
        metric({ labels: { job: 'api', canary: 'true' } }),
        metric({ labels: { job: 'api' } }),
      ])
    ).toEqual(['canary=true', 'job=api'])
  })

  it('falls back to the first tags of a single series', () => {
    expect(
      shortLabels([metric({ labels: { a: '1', b: '2', c: '3', d: '4' } })])
    ).toEqual(['a=1, b=2, c=3, …'])
  })

  it('prefixes the metric name when series come from different metrics', () => {
    expect(
      shortLabels([
        metric({ name: 'cpu', labels: { pod: 'a' } }),
        metric({ name: 'memory', labels: { pod: 'a' } }),
        metric({ name: 'cpu', labels: { pod: 'b' } }),
      ])
    ).toEqual(['cpu, pod=a', 'memory, pod=a', 'cpu, pod=b'])
  })

  it('truncates very long tag values', () => {
    const [label] = shortLabels([metric({ labels: { pod: 'x'.repeat(60) } })])

    expect(label).toBe(`pod=${'x'.repeat(31)}…`)
  })
})
