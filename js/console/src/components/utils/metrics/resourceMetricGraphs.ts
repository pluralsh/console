import type { MetricGraph } from 'components/cd/cluster/metrics/clusterMetricsGraphs'
import type { GraphSeries } from 'components/utils/Graph'
import { toPoints } from 'components/utils/metrics/metricFormats'
import {
  type PodResourceReservation,
  addPodResourceReservationSeries,
} from 'components/utils/metrics/podResourceReservations'
import type { MetricResponseFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export type ResourceMetricField =
  | 'cpu'
  | 'mem'
  | 'podCpu'
  | 'podMem'
  | 'cpuRequests'
  | 'memRequests'
  | 'cpuLimits'
  | 'memLimits'
  | 'podCpuRequests'
  | 'podMemRequests'
  | 'podCpuLimits'
  | 'podMemLimits'

type Metrics = Nullable<Nullable<MetricResponseFragment>[]>

/** Shared shape of service component and kubernetes controller metrics. */
export type ResourceMetrics = Partial<Record<ResourceMetricField, Metrics>>

export type ResourceMetricGraph = MetricGraph<
  ResourceMetrics,
  ResourceMetricField
>

function first(id: string, metrics: Metrics, dashed?: boolean): GraphSeries[] {
  const data = toPoints(metrics?.find(isNonNullable)?.values)

  return data.length > 0 ? [{ id, data, ...(dashed && { dashed }) }] : []
}

function byPod(metrics: Metrics): GraphSeries[] {
  return (metrics ?? []).filter(isNonNullable).map(({ metric, values }) => ({
    id: typeof metric?.pod === 'string' ? metric.pod : '',
    data: toPoints(values),
  }))
}

function overall(
  id: string,
  usage: Metrics,
  requests: Metrics,
  limits: Metrics
): GraphSeries[] {
  return [
    ...first(id, usage),
    ...first('requests', requests, true),
    ...first('limits', limits, true),
  ]
}

/** One graph per card, each fetching only the prometheus series it draws. */
export function resourceMetricGraphs(
  podReservations?: PodResourceReservation[]
): ResourceMetricGraph[] {
  return [
    {
      key: 'cpu',
      title: 'Overall CPU Usage (cores)',
      tooltip: 'Total CPU used by all pods, with summed requests and limits',
      format: 'cpu',
      fields: ['cpu', 'cpuRequests', 'cpuLimits'],
      series: (m) => overall('cpu', m.cpu, m.cpuRequests, m.cpuLimits),
    },
    {
      key: 'mem',
      title: 'Overall Memory Usage (bytes)',
      tooltip:
        'Total memory working set of all pods, with summed requests and limits',
      format: 'memory',
      fields: ['mem', 'memRequests', 'memLimits'],
      series: (m) => overall('memory', m.mem, m.memRequests, m.memLimits),
    },
    {
      key: 'podCpu',
      title: 'Pod CPU Usage (cores)',
      tooltip: 'CPU used by each pod, with its requests and limits',
      format: 'cpu',
      fields: ['podCpu', 'podCpuRequests', 'podCpuLimits'],
      series: (m) =>
        addPodResourceReservationSeries(
          byPod(m.podCpu),
          podReservations,
          'cpu',
          byPod(m.podCpuRequests),
          byPod(m.podCpuLimits)
        ),
    },
    {
      key: 'podMem',
      title: 'Pod Memory Usage (bytes)',
      tooltip: 'Memory working set of each pod, with its requests and limits',
      format: 'memory',
      fields: ['podMem', 'podMemRequests', 'podMemLimits'],
      series: (m) =>
        addPodResourceReservationSeries(
          byPod(m.podMem),
          podReservations,
          'memory',
          byPod(m.podMemRequests),
          byPod(m.podMemLimits)
        ),
    },
  ]
}
