import {
  NodeMetricsGrouping,
  type NodeUsageMetricsFragment,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import {
  conditionSeries,
  nodeMetricSections,
  podGroups,
} from './nodeMetricsGraphs'

const series = (metric: Record<string, string>, ...values: number[]) => ({
  metric,
  values: values.map((value, i) => ({
    timestamp: 1_700_000_000 + i * 60,
    value: String(value),
  })),
})

const graphs = nodeMetricSections().flatMap(({ graphs }) => graphs)
const graphOf = (key: string) => graphs.find((g) => g.key === key)
const seriesOf = (key: string, metrics: NodeUsageMetricsFragment) =>
  graphOf(key)?.series(metrics) ?? []

describe('nodeMetricSections', () => {
  it('gives every graph a unique key and at least one field in every grouping', () => {
    for (const grouping of Object.values(NodeMetricsGrouping)) {
      const all = nodeMetricSections(grouping).flatMap(({ graphs }) => graphs)
      expect(new Set(all.map(({ key }) => key)).size).toBe(all.length)
      for (const graph of all) expect(graph.fields.length).toBeGreaterThan(0)
    }
  })

  it('breaks workload usage out per pod and drops host-only sections', () => {
    const sections = nodeMetricSections(NodeMetricsGrouping.Pod, { limit: 1 })
    const cpu = sections
      .flatMap(({ graphs }) => graphs)
      .find(({ key }) => key === 'cpu')

    expect(sections.map(({ key }) => key)).toEqual(['health', 'cpu', 'memory'])
    expect(
      cpu
        ?.series({
          cpu: [
            series({ namespace: 'a', pod: 'web' }, 3),
            series({ namespace: 'b', pod: 'web' }, 1),
            series({ namespace: 'b', pod: 'db' }, 1),
          ],
        })
        .map(({ id }) => id)
    ).toEqual(['a/web', 'other (2 pods)'])
  })

  it('measures request efficiency within each namespace', () => {
    const efficiency = nodeMetricSections(NodeMetricsGrouping.Namespace)
      .flatMap(({ graphs }) => graphs)
      .find(({ key }) => key === 'memory-efficiency')

    expect(
      efficiency
        ?.series({
          memory: [
            series({ namespace: 'a' }, 2),
            series({ namespace: 'b' }, 1),
          ],
          memoryRequests: [series({ namespace: 'a' }, 4)],
        })
        .map(({ id, data }) => [id, data.map(({ y }) => y)])
    ).toEqual([['a', [0.5]]])
  })

  it('derives utilization from host and kube-state-metrics series', () => {
    const [host, requests] = seriesOf('memory-utilization', {
      memoryUsed: [series({}, 2, 4)],
      memoryTotal: [series({}, 8, 8)],
      memoryRequests: [series({}, 1, 2)],
      memoryAllocatable: [series({}, 4, 4)],
    })

    expect(host.data.map(({ y }) => y)).toEqual([0.25, 0.5])
    expect(requests.dashed).toBe(true)
    expect(requests.data.map(({ y }) => y)).toEqual([0.25, 0.5])
  })

  it('compares load averages against the core count', () => {
    expect(
      seriesOf('load', {
        load1: [series({}, 1)],
        load5: [series({}, 1)],
        load15: [series({}, 1)],
        cpuCores: [series({}, 4)],
      }).map(({ id, dashed }) => [id, !!dashed])
    ).toEqual([
      ['1m', false],
      ['5m', false],
      ['15m', false],
      ['cores', true],
    ])
  })

  it('breaks filesystems out by mountpoint without an additive remainder', () => {
    const mounts = Array.from({ length: 12 }, (_, i) =>
      series({ mountpoint: `/mnt/${i}` }, i / 12)
    )
    const result = seriesOf('filesystem-fullness', {
      filesystemFullness: mounts,
    })

    expect(result).toHaveLength(10)
    expect(result.some(({ id }) => id.startsWith('other'))).toBe(false)
  })
})

describe('podGroups', () => {
  it('keeps same-named pods in different namespaces apart', () => {
    expect(
      podGroups([
        series({ namespace: 'a', pod: 'web' }, 1),
        series({ namespace: 'b', pod: 'web' }, 2),
      ]).map(({ group }) => group)
    ).toEqual(['a/web', 'b/web'])
  })
})

describe('conditionSeries', () => {
  it('always shows Ready and other conditions only once they have held', () => {
    expect(
      conditionSeries([
        series({ condition: 'Ready' }, 1, 1),
        series({ condition: 'MemoryPressure' }, 0, 0),
        series({ condition: 'DiskPressure' }, 0, 1),
      ]).map(({ id }) => id)
    ).toEqual(['Ready', 'DiskPressure'])
  })
})
