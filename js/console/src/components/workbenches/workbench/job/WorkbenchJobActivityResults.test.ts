import { describe, expect, it } from 'vitest'
import { MetricSeriesFragment } from 'generated/graphql'
import {
  filterMetricSeriesByDuration,
  getMetricSeriesFromResponses,
} from './workbenchJobMetrics'

function metric({
  name = 'requests',
  labels,
}: {
  name?: string
  labels?: Nullable<Record<string, unknown>>
}): MetricSeriesFragment {
  return {
    name,
    metric: labels,
    values: [{ timestamp: '1788000000', value: '1' }],
  }
}

describe('series ids and labels', () => {
  it('uses the chart series identifiers and order for labeled legend entries', () => {
    const series = getMetricSeriesFromResponses([
      metric({ labels: { status: 'success' } }),
      metric({ labels: { status: 'error' } }),
      metric({ name: 'cpu_usage', labels: null }),
    ])

    expect(series.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'requests{status:success}', label: 'status=success' },
      { id: 'requests{status:error}', label: 'status=error' },
      { id: 'cpu_usage{}', label: 'cpu_usage' },
    ])
  })

  it('ids do not depend on label order', () => {
    const [series] = getMetricSeriesFromResponses([
      metric({ labels: { status: 'success', method: 'GET' } }),
    ])

    expect(series).toMatchObject({
      id: 'requests{method:GET,status:success}',
      label: 'method=GET, status=success',
    })
  })
})

describe('getMetricSeriesFromResponses', () => {
  it('matches flat-point series ids and labels and parses unix-second points', () => {
    const series = getMetricSeriesFromResponses([
      {
        name: 'requests',
        metric: { status: 'success', method: 'GET' },
        values: [
          { timestamp: '1788000000', value: '1.5' },
          { timestamp: '1788000030', value: 'NaN' },
          null,
        ],
      },
      null,
      { name: 'requests', metric: { status: 'error' }, values: null },
    ])

    expect(series).toEqual([
      {
        id: 'requests{method:GET,status:success}',
        label: 'method=GET, status=success',
        shortLabel: 'method=GET, status=success',
        data: [{ x: new Date(1788000000 * 1000), y: 1.5 }],
      },
      {
        id: 'requests{status:error}',
        label: 'status=error',
        shortLabel: 'status=error',
        data: [],
      },
    ])
  })
})

describe('filterMetricSeriesByDuration', () => {
  it('keeps points within the duration of the latest point across series', () => {
    const at = (seconds: number) => ({ x: new Date(seconds * 1000), y: 1 })
    const series = [
      { id: 'a', label: 'a', shortLabel: 'a', data: [at(0), at(3_000)] },
      { id: 'b', label: 'b', shortLabel: 'b', data: [at(1_000)] },
      { id: 'c', label: 'c', shortLabel: 'c', data: [at(3_600)] },
    ]

    expect(
      filterMetricSeriesByDuration(series, 3_000_000).map(({ id, data }) => ({
        id,
        data,
      }))
    ).toEqual([
      { id: 'a', data: [at(3_000)] },
      { id: 'b', data: [at(1_000)] },
      { id: 'c', data: [at(3_600)] },
    ])
    expect(
      filterMetricSeriesByDuration(series, 1_000_000).map(({ id }) => id)
    ).toEqual(['a', 'c'])
  })
})

describe('series short labels', () => {
  const shortLabels = (series: MetricSeriesFragment[]) =>
    getMetricSeriesFromResponses(series).map(({ shortLabel }) => shortLabel)

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
