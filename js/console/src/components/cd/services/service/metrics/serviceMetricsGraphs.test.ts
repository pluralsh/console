import {
  type ClusterUsageMetricsFragment,
  ServiceMetricsGrouping,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { serviceMetricSections } from './serviceMetricsGraphs'

const series = (metric: Record<string, string>, ...values: number[]) => ({
  metric,
  values: values.map((value, i) => ({
    timestamp: 1_700_000_000 + i * 60,
    value: String(value),
  })),
})

const graphOf = (grouping: ServiceMetricsGrouping, key: string) =>
  serviceMetricSections(grouping)
    .flatMap(({ graphs }) => graphs)
    .find((g) => g.key === key)

const seriesOf = (
  grouping: ServiceMetricsGrouping,
  key: string,
  metrics: ClusterUsageMetricsFragment
) => graphOf(grouping, key)?.series(metrics) ?? []

describe('serviceMetricSections', () => {
  it('fills cpu, memory, and storage as 2x2 grids in both groupings', () => {
    for (const grouping of Object.values(ServiceMetricsGrouping)) {
      const sizes = Object.fromEntries(
        serviceMetricSections(grouping).map(({ key, graphs }) => [
          key,
          graphs.length,
        ])
      )
      expect(sizes).toMatchObject({ cpu: 4, memory: 4, storage: 4 })
    }
  })

  it('never asks for node allocatable, which services lack', () => {
    for (const grouping of Object.values(ServiceMetricsGrouping))
      for (const { graphs } of serviceMetricSections(grouping))
        for (const { fields } of graphs) {
          expect(fields).not.toContain('cpuAllocatable')
          expect(fields).not.toContain('memoryAllocatable')
        }
  })

  it('derives limit utilization from the service totals', () => {
    expect(
      seriesOf(ServiceMetricsGrouping.Service, 'cpu-limit-utilization', {
        cpu: [series({}, 1, 3)],
        cpuLimits: [series({}, 4, 4)],
      })[0].data.map(({ y }) => y)
    ).toEqual([0.25, 0.75])
  })

  it('splits by pod, but volumes by claim', () => {
    const metrics = {
      memory: [series({ pod: 'a' }, 1), series({ pod: 'b' }, 2)],
      memoryRequests: [series({ pod: 'a' }, 4)],
      volumeFullness: [series({ persistentvolumeclaim: 'data' }, 0.9)],
    }
    const pod = ServiceMetricsGrouping.Pod

    expect(seriesOf(pod, 'memory', metrics).map(({ id }) => id)).toEqual([
      'b',
      'a',
    ])
    expect(seriesOf(pod, 'memory-efficiency', metrics)[0]).toMatchObject({
      id: 'a',
      data: [{ y: 0.25 }],
    })
    expect(seriesOf(pod, 'volume-fullness', metrics)[0].id).toBe('data')
  })

  it('totals per-pod phase series into a single pods graph', () => {
    expect(
      seriesOf(ServiceMetricsGrouping.Pod, 'pods', {
        podsRunning: [series({ pod: 'a' }, 1, 1), series({ pod: 'b' }, 0, 1)],
      })[0].data.map(({ y }) => y)
    ).toEqual([1, 2])
  })
})
