import type {
  MetricGraph,
  Metrics,
} from 'components/cd/cluster/metrics/clusterMetricsGraphs'
import type { GraphSeries } from 'components/utils/Graph'
import type {
  MetricResponseFragment,
  PodMetricsFragment,
} from 'generated/graphql'
import { toPoints } from 'components/utils/metrics/metricFormats'
import { isNonNullable } from 'utils/isNonNullable'

export type PodMetricField = Exclude<keyof PodMetricsFragment, '__typename'>

export type PodMetricGraph = MetricGraph<PodMetricsFragment, PodMetricField>

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
): GraphSeries[] {
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
): GraphSeries[] {
  return bySeries(metrics).map(({ container, data }) => ({
    id: suffix
      ? multiContainer
        ? `${container} ${suffix}`
        : suffix
      : container,
    data,
  }))
}

function named(metrics: Metrics, id: string): GraphSeries[] {
  return bySeries(metrics)
    .slice(0, 1)
    .map(({ data }) => ({ id, data }))
}

function fsSeries({ fsReads, fsWrites }: PodMetricsFragment): GraphSeries[] {
  const containers = new Set(
    [...bySeries(fsReads), ...bySeries(fsWrites)].map(
      ({ container }) => container
    )
  )
  const multi = containers.size > 1

  return [
    ...perContainer(fsReads, 'read', multi),
    ...perContainer(fsWrites, 'write', multi),
  ]
}

/** One graph per card, each fetching only the prometheus series it draws. */
export const POD_METRIC_GRAPHS: PodMetricGraph[] = [
  {
    key: 'cpu',
    title: 'CPU usage (cores)',
    tooltip:
      'container_cpu_usage_seconds_total rate per container, with kube-state-metrics requests and limits',
    format: 'cpu',
    fields: ['cpu', 'cpuRequests', 'cpuLimits'],
    series: (m) => usageWithReservations(m.cpu, m.cpuRequests, m.cpuLimits),
  },
  {
    key: 'memory',
    title: 'Memory working set (bytes)',
    tooltip:
      'container_memory_working_set_bytes per container, with kube-state-metrics requests and limits',
    format: 'memory',
    fields: ['memory', 'memoryRequests', 'memoryLimits'],
    series: (m) =>
      usageWithReservations(m.memory, m.memoryRequests, m.memoryLimits),
  },
  {
    key: 'throttling',
    title: 'CPU throttling',
    tooltip:
      'Share of CFS periods each container was throttled (container_cpu_cfs_throttled_periods_total / container_cpu_cfs_periods_total)',
    format: 'percent',
    fields: ['cpuThrottling'],
    series: (m) => perContainer(m.cpuThrottling),
  },
  {
    key: 'ephemeral',
    title: 'Ephemeral storage (bytes)',
    tooltip:
      'container_fs_usage_bytes per container, with kube-state-metrics ephemeral-storage requests and limits',
    format: 'memory',
    fields: [
      'ephemeralStorage',
      'ephemeralStorageRequests',
      'ephemeralStorageLimits',
    ],
    series: (m) =>
      usageWithReservations(
        m.ephemeralStorage,
        m.ephemeralStorageRequests,
        m.ephemeralStorageLimits
      ),
  },
  {
    key: 'network',
    title: 'Network throughput',
    tooltip:
      'Pod-wide container_network_receive_bytes_total and container_network_transmit_bytes_total rates',
    format: 'bytesRate',
    fields: ['networkReceive', 'networkTransmit'],
    series: (m) => [
      ...named(m.networkReceive, 'receive'),
      ...named(m.networkTransmit, 'transmit'),
    ],
  },
  {
    key: 'dropped',
    title: 'Dropped packets',
    tooltip:
      'Pod-wide container_network_{receive,transmit}_packets_dropped_total rates',
    format: 'rate',
    fields: ['networkReceiveDropped', 'networkTransmitDropped'],
    series: (m) => [
      ...named(m.networkReceiveDropped, 'receive'),
      ...named(m.networkTransmitDropped, 'transmit'),
    ],
  },
  {
    key: 'fs',
    title: 'Filesystem I/O',
    tooltip:
      'container_fs_reads_bytes_total and container_fs_writes_bytes_total rates per container',
    format: 'bytesRate',
    fields: ['fsReads', 'fsWrites'],
    series: fsSeries,
  },
  {
    key: 'restarts',
    title: 'Container restarts',
    tooltip: 'kube_pod_container_status_restarts_total per container',
    format: 'count',
    fields: ['restarts'],
    series: (m) => perContainer(m.restarts),
  },
]
