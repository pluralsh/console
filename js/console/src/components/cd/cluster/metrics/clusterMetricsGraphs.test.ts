import {
  ClusterMetricsGrouping,
  type ClusterUsageMetricsFragment,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import {
  clusterMetricSections,
  topGroups,
  usageFieldVariables,
} from './clusterMetricsGraphs'

const series = (metric: Record<string, string>, ...values: number[]) => ({
  metric,
  values: values.map((value, i) => ({
    timestamp: 1_700_000_000 + i * 60,
    value: String(value),
  })),
})

const graphOf = (grouping: ClusterMetricsGrouping, key: string) =>
  clusterMetricSections(grouping)
    .flatMap(({ graphs }) => graphs)
    .find((g) => g.key === key)

const seriesOf = (
  grouping: ClusterMetricsGrouping,
  key: string,
  metrics: ClusterUsageMetricsFragment
) => graphOf(grouping, key)?.series(metrics) ?? []

describe('clusterMetricSections', () => {
  it('overlays requests and allocatable and derives utilization when ungrouped', () => {
    const metrics = {
      cpu: [series({}, 2, 4)],
      cpuRequests: [series({}, 3, 3)],
      cpuAllocatable: [series({}, 8, 8)],
    }

    expect(
      seriesOf(ClusterMetricsGrouping.Cluster, 'cpu', metrics).map(
        ({ id, dashed }) => [id, !!dashed]
      )
    ).toEqual([
      ['usage', false],
      ['requests', true],
      ['allocatable', true],
    ])
    expect(
      seriesOf(
        ClusterMetricsGrouping.Cluster,
        'cpu-utilization',
        metrics
      )[0].data.map(({ y }) => y)
    ).toEqual([0.25, 0.5])
  })

  it('declares only the fields each graph reads', () => {
    expect(graphOf(ClusterMetricsGrouping.Cluster, 'network')?.fields).toEqual([
      'networkReceive',
      'networkTransmit',
    ])
    expect(
      graphOf(ClusterMetricsGrouping.Namespace, 'network-receive')?.fields
    ).toEqual(['networkReceive'])
    expect(usageFieldVariables(['cpu', 'cpuAllocatable'])).toEqual({
      cpu: true,
      cpuAllocatable: true,
    })
  })

  it('splits paired metrics and labels series by group', () => {
    const metrics = {
      networkReceive: [
        series({ namespace: 'a' }, 1),
        series({ namespace: 'b' }, 2),
      ],
      networkReceiveDropped: [series({ namespace: 'a' }, 1, 1)],
      networkTransmitDropped: [series({ namespace: 'a' }, 2, 3)],
    }
    const ns = ClusterMetricsGrouping.Namespace

    expect(
      seriesOf(ns, 'network-receive', metrics).map(({ id }) => id)
    ).toEqual(['b', 'a'])
    expect(
      seriesOf(ns, 'network-dropped', metrics)[0].data.map(({ y }) => y)
    ).toEqual([3, 4])
  })

  it('only offers per-group utilization for nodes', () => {
    const metrics = {
      cpu: [series({ node: 'n1' }, 1)],
      cpuAllocatable: [series({ node: 'n1' }, 4)],
    }

    expect(
      seriesOf(ClusterMetricsGrouping.Node, 'cpu-utilization', metrics)[0]
    ).toMatchObject({ id: 'n1', data: [{ y: 0.25 }] })
    expect(
      graphOf(ClusterMetricsGrouping.Namespace, 'cpu-utilization')
    ).toBeUndefined()
  })

  it('returns no series for missing data', () => {
    expect(
      seriesOf(ClusterMetricsGrouping.Cluster, 'cpu', { cpu: [] })
    ).toEqual([])
  })
})

describe('topGroups', () => {
  const at = (t: number) => new Date(t * 1000)
  const groups = [1, 5, 3, 2].map((y, i) => ({
    group: `g${i}`,
    data: [{ x: at(0), y }],
  }))

  it('keeps the largest groups and sums the rest into other', () => {
    const result = topGroups(groups, { limit: 2, noun: 'nodes' })
    expect(result.map(({ id }) => id)).toEqual(['g1', 'g2', 'other (2 nodes)'])
    expect(result[2].data[0].y).toBe(3)
  })

  it('omits other for non-additive metrics', () => {
    expect(
      topGroups(groups, { limit: 2, additive: false }).map(({ id }) => id)
    ).toEqual(['g1', 'g2'])
  })
})
