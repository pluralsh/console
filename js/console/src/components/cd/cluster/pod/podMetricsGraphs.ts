import type {
  MetricResponseFragment,
  PodMetricsFragment,
} from 'generated/graphql'
import {
  type MetricFormat,
  toPoints,
} from 'components/utils/metrics/metricFormats'
import { isNonNullable } from 'utils/isNonNullable'

export type PodGraphSeries = {
  id: string
  data: { x: Date; y: number }[]
  dashed?: boolean
}

export type PodMetricGraph = {
  key: string
  title: string
  tooltip: string
  format: MetricFormat
  data: PodGraphSeries[]
}

type Metrics = Nullable<Nullable<MetricResponseFragment>[]>

function containerOf(metric: MetricResponseFragment['metric']) {
  const container = metric?.container
  return typeof container === 'string' && container ? container : 'pod'
}

function bySeries(metrics: Metrics) {
  return (metrics ?? [])
    .filter(isNonNullable)
    .map(({ metric, values }) => ({
      container: containerOf(metric),
      data: toPoints(values),
    }))
    .filter(({ data }) => data.length > 0)
}

/**
 * Per-container usage alongside dashed request/limit lines. Reservation
 * lines drop the container prefix when the pod only runs one container.
 */
function usageWithReservations(
  usage: Metrics,
  requests: Metrics,
  limits: Metrics
): PodGraphSeries[] {
  const used = bySeries(usage)
  const reqs = bySeries(requests)
  const lims = bySeries(limits)
  const containers = new Set(
    [...used, ...reqs, ...lims].map(({ container }) => container)
  )
  const label = (container: string, suffix: string) =>
    containers.size > 1 ? `${container} ${suffix}` : suffix

  return [
    ...used.map(({ container, data }) => ({ id: container, data })),
    ...reqs.map(({ container, data }) => ({
      id: label(container, 'request'),
      data,
      dashed: true,
    })),
    ...lims.map(({ container, data }) => ({
      id: label(container, 'limit'),
      data,
      dashed: true,
    })),
  ]
}

function perContainer(
  metrics: Metrics,
  suffix?: string,
  multiContainer = true
): PodGraphSeries[] {
  return bySeries(metrics).map(({ container, data }) => ({
    id: suffix
      ? multiContainer
        ? `${container} ${suffix}`
        : suffix
      : container,
    data,
  }))
}

function named(metrics: Metrics, id: string): PodGraphSeries[] {
  return bySeries(metrics)
    .slice(0, 1)
    .map(({ data }) => ({ id, data }))
}

export function buildPodMetricGraphs(
  metrics: Nullable<PodMetricsFragment>
): PodMetricGraph[] {
  if (!metrics) return []
  const fsContainers = new Set(
    [...bySeries(metrics.fsReads), ...bySeries(metrics.fsWrites)].map(
      ({ container }) => container
    )
  )
  const multiFs = fsContainers.size > 1

  return [
    {
      key: 'cpu',
      title: 'CPU usage (cores)',
      tooltip:
        'container_cpu_usage_seconds_total rate per container, with kube-state-metrics requests and limits',
      format: 'cpu' as const,
      data: usageWithReservations(
        metrics.cpu,
        metrics.cpuRequests,
        metrics.cpuLimits
      ),
    },
    {
      key: 'memory',
      title: 'Memory working set (bytes)',
      tooltip:
        'container_memory_working_set_bytes per container, with kube-state-metrics requests and limits',
      format: 'memory' as const,
      data: usageWithReservations(
        metrics.memory,
        metrics.memoryRequests,
        metrics.memoryLimits
      ),
    },
    {
      key: 'throttling',
      title: 'CPU throttling',
      tooltip:
        'Share of CFS periods each container was throttled (container_cpu_cfs_throttled_periods_total / container_cpu_cfs_periods_total)',
      format: 'percent' as const,
      data: perContainer(metrics.cpuThrottling),
    },
    {
      key: 'ephemeral',
      title: 'Ephemeral storage (bytes)',
      tooltip:
        'container_fs_usage_bytes per container, with kube-state-metrics ephemeral-storage requests and limits',
      format: 'memory' as const,
      data: usageWithReservations(
        metrics.ephemeralStorage,
        metrics.ephemeralStorageRequests,
        metrics.ephemeralStorageLimits
      ),
    },
    {
      key: 'network',
      title: 'Network throughput',
      tooltip:
        'Pod-wide container_network_receive_bytes_total and container_network_transmit_bytes_total rates',
      format: 'bytesRate' as const,
      data: [
        ...named(metrics.networkReceive, 'receive'),
        ...named(metrics.networkTransmit, 'transmit'),
      ],
    },
    {
      key: 'dropped',
      title: 'Dropped packets',
      tooltip:
        'Pod-wide container_network_{receive,transmit}_packets_dropped_total rates',
      format: 'rate' as const,
      data: [
        ...named(metrics.networkReceiveDropped, 'receive'),
        ...named(metrics.networkTransmitDropped, 'transmit'),
      ],
    },
    {
      key: 'fs',
      title: 'Filesystem I/O',
      tooltip:
        'container_fs_reads_bytes_total and container_fs_writes_bytes_total rates per container',
      format: 'bytesRate' as const,
      data: [
        ...perContainer(metrics.fsReads, 'read', multiFs),
        ...perContainer(metrics.fsWrites, 'write', multiFs),
      ],
    },
    {
      key: 'restarts',
      title: 'Container restarts',
      tooltip: 'kube_pod_container_status_restarts_total per container',
      format: 'count' as const,
      data: perContainer(metrics.restarts),
    },
  ]
}
