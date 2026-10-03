import { describe, expect, it } from 'vitest'
import type { PodMetricsFragment } from 'generated/graphql'
import { POD_METRIC_FORMATTERS, buildPodMetricGraphs } from './podMetricsGraphs'

const series = (container: string | null, value = '1') => ({
  metric: container ? { container } : {},
  values: [{ timestamp: 1700000000, value }],
})

const graph = (metrics: Partial<PodMetricsFragment>, key: string) =>
  buildPodMetricGraphs(metrics as PodMetricsFragment).find(
    (g) => g.key === key
  )!

describe('buildPodMetricGraphs', () => {
  it('drops the container prefix on reservations for single-container pods', () => {
    const cpu = graph(
      {
        cpu: [series('app')],
        cpuRequests: [series('app', '0.1')],
        cpuLimits: [series('app', '0.5')],
      },
      'cpu'
    )

    expect(cpu.data.map(({ id, dashed }) => [id, !!dashed])).toEqual([
      ['app', false],
      ['request', true],
      ['limit', true],
    ])
    expect(cpu.data[1].data[0]).toEqual({
      x: new Date(1700000000 * 1000),
      y: 0.1,
    })
  })

  it('prefixes reservations with the container when there are several', () => {
    const memory = graph(
      {
        memory: [series('app'), series('sidecar')],
        memoryLimits: [series('app'), series('sidecar')],
      },
      'memory'
    )

    expect(memory.data.map(({ id }) => id)).toEqual([
      'app',
      'sidecar',
      'app limit',
      'sidecar limit',
    ])
  })

  it('names pod-wide network series by direction and skips empty or NaN data', () => {
    const network = graph(
      {
        networkReceive: [series(null, '2048')],
        networkTransmit: [series(null, 'NaN')],
      },
      'network'
    )

    expect(network.data.map(({ id }) => id)).toEqual(['receive'])
  })

  it('formats each unit', () => {
    expect(POD_METRIC_FORMATTERS.bytesRate(1536)).toBe('1.5 KiB/s')
    expect(POD_METRIC_FORMATTERS.percent(0.125)).toBe('12.5%')
    expect(POD_METRIC_FORMATTERS.count(3)).toBe('3')
    expect(POD_METRIC_FORMATTERS.cpu(0.0015)).toBe('1.5m')
  })
})
