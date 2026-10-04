import type { GraphSeries } from 'components/utils/Graph'
import {
  type MetricFormat,
  toPoints,
} from 'components/utils/metrics/metricFormats'
import {
  ClusterMetricsGrouping,
  type ClusterUsageMetricsFragment,
  type MetricResponseFragment,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export type UsageField = Exclude<
  keyof ClusterUsageMetricsFragment,
  '__typename'
>

export type ClusterMetricGraph = {
  key: string
  title: string
  tooltip: string
  format: MetricFormat
  /** the only usage metrics (and so prometheus queries) this graph fetches */
  fields: UsageField[]
  series: (metrics: ClusterUsageMetricsFragment) => GraphSeries[]
}

export type ClusterMetricSection = {
  key: string
  title: string
  description?: string
  graphs: ClusterMetricGraph[]
}

type Metrics = Nullable<Nullable<MetricResponseFragment>[]>
type Point = GraphSeries['data'][number]
type Group = { group: string; data: Point[] }

export const DEFAULT_TOP_GROUPS = 10

const GROUP_LABELS: Record<ClusterMetricsGrouping, string> = {
  [ClusterMetricsGrouping.Cluster]: 'cluster',
  [ClusterMetricsGrouping.Namespace]: 'namespace',
  [ClusterMetricsGrouping.Node]: 'node',
}

/** Query variables enabling just the `@include`d usage fields a graph needs. */
export function usageFieldVariables(fields: UsageField[]) {
  return Object.fromEntries(fields.map((field) => [field, true])) as Partial<
    Record<UsageField, boolean>
  >
}

function groupsOf(metrics: Metrics, grouping: ClusterMetricsGrouping) {
  const label = GROUP_LABELS[grouping]
  return (metrics ?? [])
    .filter(isNonNullable)
    .map(({ metric, values }): Group => {
      const value = metric?.[label]
      return {
        group:
          grouping === ClusterMetricsGrouping.Cluster
            ? 'cluster'
            : typeof value === 'string' && value
              ? value
              : `(no ${label})`,
        data: toPoints(values),
      }
    })
    .filter(({ data }) => data.length > 0)
}

function first(metrics: Metrics) {
  return groupsOf(metrics, ClusterMetricsGrouping.Cluster)[0]?.data ?? []
}

const timeKey = (p: Point) => p.x.getTime()

function sumPoints(series: Point[][]): Point[] {
  const totals = new Map<number, number>()
  for (const points of series)
    for (const p of points)
      totals.set(timeKey(p), (totals.get(timeKey(p)) ?? 0) + p.y)
  return [...totals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, y]) => ({ x: new Date(t), y }))
}

function divide(numerator: Point[], denominator: Point[]): Point[] {
  const byTime = new Map(denominator.map((p) => [timeKey(p), p.y]))
  return numerator.flatMap((p) => {
    const d = byTime.get(timeKey(p))
    return d ? [{ x: p.x, y: p.y / d }] : []
  })
}

const mean = (points: Point[]) =>
  points.reduce((acc, { y }) => acc + y, 0) / Math.max(points.length, 1)

/**
 * Keeps the `limit` groups with the highest average, folding the remainder into
 * a single summed "other" series when the metric is additive.
 */
export function topGroups(
  groups: Group[],
  { limit = DEFAULT_TOP_GROUPS, additive = true, noun = 'groups' } = {}
): GraphSeries[] {
  const ranked = [...groups].sort((a, b) => mean(b.data) - mean(a.data))
  const kept = ranked
    .slice(0, limit)
    .map(({ group, data }) => ({ id: group, data }))
  const rest = ranked.slice(limit)
  if (!additive || rest.length === 0) return kept
  return [
    ...kept,
    {
      id: `other (${rest.length} ${noun})`,
      data: sumPoints(rest.map(({ data }) => data)),
    },
  ]
}

function ratioByGroup(
  numerator: Metrics,
  denominator: Metrics,
  grouping: ClusterMetricsGrouping
): Group[] {
  const denominators = new Map(
    groupsOf(denominator, grouping).map(({ group, data }) => [group, data])
  )
  return groupsOf(numerator, grouping).flatMap(({ group, data }) => {
    const d = denominators.get(group)
    const ratio = d ? divide(data, d) : []
    return ratio.length > 0 ? [{ group, data: ratio }] : []
  })
}

function sumByGroup(grouping: ClusterMetricsGrouping, ...metrics: Metrics[]) {
  const byGroup = new Map<string, Point[][]>()
  for (const m of metrics)
    for (const { group, data } of groupsOf(m, grouping))
      byGroup.set(group, [...(byGroup.get(group) ?? []), data])
  return [...byGroup.entries()].map(([group, series]) => ({
    group,
    data: sumPoints(series),
  }))
}

const solid = (id: string, data: Point[]): GraphSeries[] =>
  data.length > 0 ? [{ id, data }] : []
const dashed = (id: string, data: Point[]): GraphSeries[] =>
  data.length > 0 ? [{ id, data, dashed: true }] : []

const CLUSTER_SECTIONS: ClusterMetricSection[] = [
  {
    key: 'cpu',
    title: 'CPU',
    graphs: [
      {
        key: 'cpu',
        title: 'CPU usage (cores)',
        tooltip:
          'container_cpu_usage_seconds_total rate across all containers, against kube-state-metrics requests and limits and node allocatable cpu',
        format: 'cpu',
        fields: ['cpu', 'cpuRequests', 'cpuLimits', 'cpuAllocatable'],
        series: (m) => [
          ...solid('usage', first(m.cpu)),
          ...dashed('requests', first(m.cpuRequests)),
          ...dashed('limits', first(m.cpuLimits)),
          ...dashed('allocatable', first(m.cpuAllocatable)),
        ],
      },
      {
        key: 'cpu-utilization',
        title: 'CPU utilization',
        tooltip:
          'CPU usage and requests as a share of allocatable node cpu. Requests above 100% means pods cannot be scheduled.',
        format: 'percent',
        fields: ['cpu', 'cpuRequests', 'cpuAllocatable'],
        series: (m) => [
          ...solid('usage', divide(first(m.cpu), first(m.cpuAllocatable))),
          ...dashed(
            'requests',
            divide(first(m.cpuRequests), first(m.cpuAllocatable))
          ),
        ],
      },
      {
        key: 'cpu-throttling',
        title: 'CPU throttling',
        tooltip:
          'Share of CFS periods in which containers were throttled for hitting their cpu limit',
        format: 'percent',
        fields: ['cpuThrottling'],
        series: (m) => solid('throttled', first(m.cpuThrottling)),
      },
    ],
  },
  {
    key: 'memory',
    title: 'Memory',
    graphs: [
      {
        key: 'memory',
        title: 'Memory working set (bytes)',
        tooltip:
          'container_memory_working_set_bytes across all containers, against kube-state-metrics requests and limits and node allocatable memory',
        format: 'memory',
        fields: [
          'memory',
          'memoryRequests',
          'memoryLimits',
          'memoryAllocatable',
        ],
        series: (m) => [
          ...solid('working set', first(m.memory)),
          ...dashed('requests', first(m.memoryRequests)),
          ...dashed('limits', first(m.memoryLimits)),
          ...dashed('allocatable', first(m.memoryAllocatable)),
        ],
      },
      {
        key: 'memory-utilization',
        title: 'Memory utilization',
        tooltip:
          'Memory working set and requests as a share of allocatable node memory',
        format: 'percent',
        fields: ['memory', 'memoryRequests', 'memoryAllocatable'],
        series: (m) => [
          ...solid(
            'working set',
            divide(first(m.memory), first(m.memoryAllocatable))
          ),
          ...dashed(
            'requests',
            divide(first(m.memoryRequests), first(m.memoryAllocatable))
          ),
        ],
      },
      {
        key: 'oom-kills',
        title: 'OOM kills',
        tooltip:
          'Containers killed for exceeding their memory limit (container_oom_events_total)',
        format: 'count',
        fields: ['oomKills'],
        series: (m) => solid('oom kills', first(m.oomKills)),
      },
    ],
  },
  {
    key: 'network',
    title: 'Network',
    graphs: [
      {
        key: 'network',
        title: 'Network throughput',
        tooltip:
          'Pod container_network_receive_bytes_total and container_network_transmit_bytes_total rates',
        format: 'bytesRate',
        fields: ['networkReceive', 'networkTransmit'],
        series: (m) => [
          ...solid('receive', first(m.networkReceive)),
          ...solid('transmit', first(m.networkTransmit)),
        ],
      },
      {
        key: 'network-dropped',
        title: 'Dropped packets',
        tooltip:
          'Pod container_network_{receive,transmit}_packets_dropped_total rates',
        format: 'rate',
        fields: ['networkReceiveDropped', 'networkTransmitDropped'],
        series: (m) => [
          ...solid('receive', first(m.networkReceiveDropped)),
          ...solid('transmit', first(m.networkTransmitDropped)),
        ],
      },
    ],
  },
  {
    key: 'storage',
    title: 'Storage',
    graphs: [
      {
        key: 'volumes',
        title: 'Persistent volumes (bytes)',
        tooltip:
          'kubelet_volume_stats_used_bytes against kubelet_volume_stats_capacity_bytes for mounted persistent volumes',
        format: 'memory',
        fields: ['volumeUsage', 'volumeCapacity'],
        series: (m) => [
          ...solid('used', first(m.volumeUsage)),
          ...dashed('capacity', first(m.volumeCapacity)),
        ],
      },
      {
        key: 'ephemeral',
        title: 'Ephemeral storage (bytes)',
        tooltip: 'container_fs_usage_bytes across all containers',
        format: 'memory',
        fields: ['ephemeralStorage'],
        series: (m) => solid('usage', first(m.ephemeralStorage)),
      },
      {
        key: 'fs-io',
        title: 'Filesystem I/O',
        tooltip:
          'container_fs_reads_bytes_total and container_fs_writes_bytes_total rates',
        format: 'bytesRate',
        fields: ['fsReads', 'fsWrites'],
        series: (m) => [
          ...solid('read', first(m.fsReads)),
          ...solid('write', first(m.fsWrites)),
        ],
      },
    ],
  },
  {
    key: 'workloads',
    title: 'Workloads',
    graphs: [
      {
        key: 'pods',
        title: 'Pods',
        tooltip:
          'Running and pending pods from kube_pod_status_phase. Sustained pending pods usually mean the cluster is out of capacity.',
        format: 'count',
        fields: ['podsRunning', 'podsPending'],
        series: (m) => [
          ...solid('running', first(m.podsRunning)),
          ...dashed('pending', first(m.podsPending)),
        ],
      },
      {
        key: 'restarts',
        title: 'Container restarts',
        tooltip:
          'Increase in kube_pod_container_status_restarts_total over each rate window',
        format: 'count',
        fields: ['restarts'],
        series: (m) => solid('restarts', first(m.restarts)),
      },
    ],
  },
]

function groupedSections(
  grouping: ClusterMetricsGrouping,
  limit: number
): ClusterMetricSection[] {
  const label = GROUP_LABELS[grouping]
  const noun = `${label}s`
  const top = (groups: Group[], additive = true) =>
    topGroups(groups, { limit, additive, noun })
  const isNode = grouping === ClusterMetricsGrouping.Node

  const perGroup = (
    field: UsageField,
    graph: Omit<ClusterMetricGraph, 'fields' | 'series'>,
    {
      additive = true,
      filter = () => true,
    }: { additive?: boolean; filter?: (group: Group) => boolean } = {}
  ): ClusterMetricGraph => ({
    ...graph,
    fields: [field],
    series: (m) => top(groupsOf(m[field], grouping).filter(filter), additive),
  })

  return [
    {
      key: 'cpu',
      title: 'CPU',
      graphs: [
        perGroup('cpu', {
          key: 'cpu',
          title: `CPU usage by ${label} (cores)`,
          tooltip: `container_cpu_usage_seconds_total rate summed per ${label}`,
          format: 'cpu',
        }),
        ...(isNode
          ? [
              {
                key: 'cpu-utilization',
                title: 'CPU utilization by node',
                tooltip: 'CPU usage as a share of each node’s allocatable cpu',
                format: 'percent' as const,
                fields: ['cpu', 'cpuAllocatable'] as UsageField[],
                series: (m: ClusterUsageMetricsFragment) =>
                  top(ratioByGroup(m.cpu, m.cpuAllocatable, grouping), false),
              },
            ]
          : []),
        perGroup('cpuRequests', {
          key: 'cpu-requests',
          title: `CPU requests by ${label} (cores)`,
          tooltip: `kube-state-metrics cpu requests summed per ${label}`,
          format: 'cpu',
        }),
        perGroup(
          'cpuThrottling',
          {
            key: 'cpu-throttling',
            title: `CPU throttling by ${label}`,
            tooltip: `Share of CFS periods throttled per ${label}`,
            format: 'percent',
          },
          { additive: false }
        ),
      ],
    },
    {
      key: 'memory',
      title: 'Memory',
      graphs: [
        perGroup('memory', {
          key: 'memory',
          title: `Memory working set by ${label} (bytes)`,
          tooltip: `container_memory_working_set_bytes summed per ${label}`,
          format: 'memory',
        }),
        ...(isNode
          ? [
              {
                key: 'memory-utilization',
                title: 'Memory utilization by node',
                tooltip:
                  'Memory working set as a share of each node’s allocatable memory',
                format: 'percent' as const,
                fields: ['memory', 'memoryAllocatable'] as UsageField[],
                series: (m: ClusterUsageMetricsFragment) =>
                  top(
                    ratioByGroup(m.memory, m.memoryAllocatable, grouping),
                    false
                  ),
              },
            ]
          : []),
        perGroup('memoryRequests', {
          key: 'memory-requests',
          title: `Memory requests by ${label} (bytes)`,
          tooltip: `kube-state-metrics memory requests summed per ${label}`,
          format: 'memory',
        }),
        perGroup('oomKills', {
          key: 'oom-kills',
          title: `OOM kills by ${label}`,
          tooltip: `container_oom_events_total increase per ${label}`,
          format: 'count',
        }),
      ],
    },
    {
      key: 'network',
      title: 'Network',
      graphs: [
        perGroup('networkReceive', {
          key: 'network-receive',
          title: `Network receive by ${label}`,
          tooltip: `container_network_receive_bytes_total rate per ${label}`,
          format: 'bytesRate',
        }),
        perGroup('networkTransmit', {
          key: 'network-transmit',
          title: `Network transmit by ${label}`,
          tooltip: `container_network_transmit_bytes_total rate per ${label}`,
          format: 'bytesRate',
        }),
        {
          key: 'network-dropped',
          title: `Dropped packets by ${label}`,
          tooltip: `Received and transmitted packets dropped per second, per ${label}`,
          format: 'rate',
          fields: ['networkReceiveDropped', 'networkTransmitDropped'],
          series: (m) =>
            top(
              sumByGroup(
                grouping,
                m.networkReceiveDropped,
                m.networkTransmitDropped
              )
            ),
        },
      ],
    },
    {
      key: 'storage',
      title: 'Storage',
      graphs: [
        perGroup('volumeUsage', {
          key: 'volumes',
          title: `Persistent volume usage by ${label} (bytes)`,
          tooltip: `kubelet_volume_stats_used_bytes summed per ${label}`,
          format: 'memory',
        }),
        perGroup('ephemeralStorage', {
          key: 'ephemeral',
          title: `Ephemeral storage by ${label} (bytes)`,
          tooltip: `container_fs_usage_bytes summed per ${label}`,
          format: 'memory',
        }),
        perGroup('fsReads', {
          key: 'fs-reads',
          title: `Filesystem reads by ${label}`,
          tooltip: `container_fs_reads_bytes_total rate per ${label}`,
          format: 'bytesRate',
        }),
        perGroup('fsWrites', {
          key: 'fs-writes',
          title: `Filesystem writes by ${label}`,
          tooltip: `container_fs_writes_bytes_total rate per ${label}`,
          format: 'bytesRate',
        }),
      ],
    },
    {
      key: 'workloads',
      title: 'Workloads',
      graphs: [
        perGroup('podsRunning', {
          key: 'pods-running',
          title: `Running pods by ${label}`,
          tooltip: `Pods in the Running phase per ${label}`,
          format: 'count',
        }),
        perGroup(
          'podsPending',
          {
            key: 'pods-pending',
            title: `Pending pods by ${label}`,
            tooltip: `Pods stuck in the Pending phase per ${label}; only ${noun} with pending pods are shown`,
            format: 'count',
          },
          { filter: ({ data }) => data.some(({ y }) => y > 0) }
        ),
        perGroup('restarts', {
          key: 'restarts',
          title: `Container restarts by ${label}`,
          tooltip: `Increase in kube_pod_container_status_restarts_total per ${label}`,
          format: 'count',
        }),
      ],
    },
  ]
}

/** The dashboard layout for a grouping; each graph fetches its own `fields`. */
export function clusterMetricSections(
  grouping: ClusterMetricsGrouping,
  { limit = DEFAULT_TOP_GROUPS } = {}
): ClusterMetricSection[] {
  const sections =
    grouping === ClusterMetricsGrouping.Cluster
      ? CLUSTER_SECTIONS
      : groupedSections(grouping, limit)
  return sections.map((section) => ({
    ...section,
    description: SECTION_DESCRIPTIONS[section.key],
  }))
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  cpu: 'Usage, reservations, and throttling',
  memory: 'Working set, reservations, and OOM kills',
  network: 'Pod throughput and dropped packets',
  storage: 'Persistent volumes, ephemeral storage, and filesystem I/O',
  workloads: 'Pod scheduling and container restarts',
}
