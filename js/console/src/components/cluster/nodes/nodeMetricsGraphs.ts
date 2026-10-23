import {
  DEFAULT_TOP_GROUPS,
  dashed,
  divide,
  first,
  type Group,
  groupsOf,
  type Metrics,
  type MetricGraph,
  type MetricSection,
  solid,
  topGroups,
} from 'components/cd/cluster/metrics/clusterMetricsGraphs'
import { toPoints } from 'components/utils/metrics/metricFormats'
import {
  NodeMetricsGrouping,
  type NodeUsageMetricsFragment,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export type NodeUsageField = Exclude<
  keyof NodeUsageMetricsFragment,
  '__typename'
>
export type NodeMetricGraph = MetricGraph<
  NodeUsageMetricsFragment,
  NodeUsageField
>
export type NodeMetricSection = MetricSection<
  NodeUsageMetricsFragment,
  NodeUsageField
>

/** Per-pod series carry both `namespace` and `pod`, joined so same-named pods stay distinct. */
export function podGroups(metrics: Metrics): Group[] {
  return (metrics ?? [])
    .filter(isNonNullable)
    .map(({ metric, values }) => ({
      group: `${metric?.namespace ?? '(no namespace)'}/${metric?.pod ?? '(no pod)'}`,
      data: toPoints(values),
    }))
    .filter(({ data }) => data.length > 0)
}

/**
 * Every condition but Ready is a problem signal (pressure, NetworkUnavailable, node-problem-detector's),
 * so those only appear once they've held at some point in the window.
 */
export function conditionSeries(metrics: Metrics) {
  return groupsOf(metrics, 'condition')
    .filter(
      ({ group, data }) => group === 'Ready' || data.some(({ y }) => y > 0)
    )
    .map(({ group, data }) => ({ id: group, data }))
}

const CONDITIONS_GRAPH: NodeMetricGraph = {
  key: 'conditions',
  title: 'Node conditions',
  tooltip:
    'kube_node_status_condition: 1 while a condition holds. Ready should stay at 1; other conditions only appear once they have fired.',
  format: 'count',
  fields: ['conditions'],
  series: (m) => conditionSeries(m.conditions),
}

const NODE_SECTIONS: NodeMetricSection[] = [
  {
    key: 'health',
    title: 'Health',
    description: 'Node conditions, pod capacity, restarts, and OOM kills',
    graphs: [
      CONDITIONS_GRAPH,
      {
        key: 'pods',
        title: 'Pods',
        tooltip:
          'Running pods scheduled on this node against its pod capacity (kube_node_status_allocatable pods)',
        format: 'count',
        fields: ['podsRunning', 'podsAllocatable'],
        series: (m) => [
          ...solid('running', first(m.podsRunning)),
          ...dashed('capacity', first(m.podsAllocatable)),
        ],
      },
      {
        key: 'restarts',
        title: 'Container restarts and OOM kills',
        tooltip:
          'Increase in kube_pod_container_status_restarts_total and container_oom_events_total for pods on this node',
        format: 'count',
        fields: ['restarts', 'oomKills'],
        series: (m) => [
          ...solid('restarts', first(m.restarts)),
          ...solid('oom kills', first(m.oomKills)),
        ],
      },
    ],
  },
  {
    key: 'cpu',
    title: 'CPU',
    description: 'Host utilization, reservations, and load',
    graphs: [
      {
        key: 'cpu-utilization',
        title: 'CPU utilization',
        tooltip:
          'Host cpu time spent busy (node_cpu_seconds_total, or the kubelet node_cpu_usage_seconds_total against cpu capacity without node-exporter), with pod cpu requests as a share of allocatable cpu',
        format: 'percent',
        fields: ['cpuUtilization', 'cpuRequests', 'cpuAllocatable'],
        series: (m) => [
          ...solid('host busy', first(m.cpuUtilization)),
          ...dashed(
            'requests',
            divide(first(m.cpuRequests), first(m.cpuAllocatable))
          ),
        ],
      },
      {
        key: 'cpu',
        title: 'CPU usage (cores)',
        tooltip:
          'container_cpu_usage_seconds_total rate for containers on this node, against kube-state-metrics requests and limits and allocatable cpu',
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
        key: 'cpu-modes',
        title: 'CPU time by mode',
        tooltip:
          'Share of host cpu time per non-idle mode. High iowait points at slow disks; steal at a noisy hypervisor neighbor.',
        format: 'percent',
        fields: ['cpuModes'],
        series: (m) =>
          topGroups(groupsOf(m.cpuModes, 'mode'), { noun: 'modes' }),
      },
      {
        key: 'load',
        title: 'Load average',
        tooltip:
          'node_load1, node_load5 and node_load15 against the core count; load sustained above it means runnable tasks are queueing',
        format: 'number',
        fields: ['load1', 'load5', 'load15', 'cpuCores'],
        series: (m) => [
          ...solid('1m', first(m.load1)),
          ...solid('5m', first(m.load5)),
          ...solid('15m', first(m.load15)),
          ...dashed('cores', first(m.cpuCores)),
        ],
      },
    ],
  },
  {
    key: 'memory',
    title: 'Memory',
    description: 'Host memory, reservations, and paging',
    graphs: [
      {
        key: 'memory-utilization',
        title: 'Memory utilization',
        tooltip:
          'Host memory in use (MemTotal less MemAvailable, or the kubelet node_memory_working_set_bytes without node-exporter) as a share of total, with pod memory requests as a share of allocatable memory',
        format: 'percent',
        fields: [
          'memoryUsed',
          'memoryTotal',
          'memoryRequests',
          'memoryAllocatable',
        ],
        series: (m) => [
          ...solid(
            'host used',
            divide(first(m.memoryUsed), first(m.memoryTotal))
          ),
          ...dashed(
            'requests',
            divide(first(m.memoryRequests), first(m.memoryAllocatable))
          ),
        ],
      },
      {
        key: 'host-memory',
        title: 'Host memory (bytes)',
        tooltip:
          'node-exporter memory in use and page cache plus buffers, against total memory',
        format: 'memory',
        fields: ['memoryUsed', 'memoryCached', 'memoryTotal'],
        series: (m) => [
          ...solid('used', first(m.memoryUsed)),
          ...solid('cache and buffers', first(m.memoryCached)),
          ...dashed('total', first(m.memoryTotal)),
        ],
      },
      {
        key: 'memory',
        title: 'Memory working set (bytes)',
        tooltip:
          'container_memory_working_set_bytes for containers on this node, against kube-state-metrics requests and limits and allocatable memory',
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
        key: 'page-faults',
        title: 'Major page faults',
        tooltip:
          'node_vmstat_pgmajfault rate; sustained major faults mean the node is reading evicted pages back from disk',
        format: 'rate',
        fields: ['majorPageFaults'],
        series: (m) => solid('major faults', first(m.majorPageFaults)),
      },
    ],
  },
  {
    key: 'disk',
    title: 'Disk',
    description: 'Filesystem fullness, throughput, and saturation',
    graphs: [
      {
        key: 'filesystem-fullness',
        title: 'Filesystem usage',
        tooltip:
          'Used share of each host filesystem (node_filesystem_avail_bytes against node_filesystem_size_bytes), excluding tmpfs, overlay and kubelet pod mounts',
        format: 'percent',
        fields: ['filesystemFullness'],
        series: (m) =>
          topGroups(groupsOf(m.filesystemFullness, 'mountpoint'), {
            additive: false,
            noun: 'mounts',
          }),
      },
      {
        key: 'disk-io',
        title: 'Disk throughput',
        tooltip:
          'node_disk_read_bytes_total and node_disk_written_bytes_total rates across all disks',
        format: 'bytesRate',
        fields: ['diskRead', 'diskWrite'],
        series: (m) => [
          ...solid('read', first(m.diskRead)),
          ...solid('write', first(m.diskWrite)),
        ],
      },
      {
        key: 'disk-busy',
        title: 'Disk saturation',
        tooltip:
          'Share of time the busiest disk spent servicing I/O (node_disk_io_time_seconds_total); near 100% means requests are queueing',
        format: 'percent',
        fields: ['diskBusy'],
        series: (m) => solid('busiest disk', first(m.diskBusy)),
      },
    ],
  },
  {
    key: 'network',
    title: 'Network',
    description: 'Physical interface throughput, errors, and drops',
    graphs: [
      {
        key: 'network',
        title: 'Network throughput',
        tooltip:
          'node_network_receive_bytes_total and node_network_transmit_bytes_total rates on physical interfaces, excluding loopback and pod virtual interfaces',
        format: 'bytesRate',
        fields: ['networkReceive', 'networkTransmit'],
        series: (m) => [
          ...solid('receive', first(m.networkReceive)),
          ...solid('transmit', first(m.networkTransmit)),
        ],
      },
      {
        key: 'network-errors',
        title: 'Network errors and drops',
        tooltip:
          'Receive and transmit errors and dropped packets per second on physical interfaces',
        format: 'rate',
        fields: ['networkErrors', 'networkDropped'],
        series: (m) => [
          ...solid('errors', first(m.networkErrors)),
          ...solid('dropped', first(m.networkDropped)),
        ],
      },
    ],
  },
]

function groupedSections(
  grouping: NodeMetricsGrouping.Namespace | NodeMetricsGrouping.Pod,
  limit: number
): NodeMetricSection[] {
  const isPod = grouping === NodeMetricsGrouping.Pod
  const label = isPod ? 'pod' : 'namespace'
  const noun = `${label}s`
  const groups = (metrics: Metrics) =>
    isPod ? podGroups(metrics) : groupsOf(metrics, 'namespace')
  const top = (g: Group[], additive = true) =>
    topGroups(g, { limit, additive, noun })

  const perGroup = (
    field: NodeUsageField,
    graph: Omit<NodeMetricGraph, 'fields' | 'series'>
  ): NodeMetricGraph => ({
    ...graph,
    fields: [field],
    series: (m) => top(groups(m[field])),
  })

  const efficiency = (
    resource: 'cpu' | 'memory',
    name: string,
    usage: string
  ): NodeMetricGraph => {
    const requests: NodeUsageField = `${resource}Requests`
    return {
      key: `${resource}-efficiency`,
      title: `${name} request efficiency by ${label}`,
      tooltip: `${usage} as a share of requested ${resource} per ${label}; well below 100% means over-provisioned requests, above it means bursting past them`,
      format: 'percent',
      fields: [resource, requests],
      series: (m) => {
        const denominators = new Map(
          groups(m[requests]).map(({ group, data }) => [group, data])
        )
        return top(
          groups(m[resource]).flatMap(({ group, data }) => {
            const d = denominators.get(group)
            const ratio = d ? divide(data, d) : []
            return ratio.length > 0 ? [{ group, data: ratio }] : []
          }),
          false
        )
      },
    }
  }

  return [
    {
      key: 'health',
      title: 'Health',
      description: `Node conditions, and ${label} restarts and OOM kills`,
      graphs: [
        CONDITIONS_GRAPH,
        ...(isPod
          ? []
          : [
              perGroup('podsRunning', {
                key: 'pods',
                title: 'Running pods by namespace',
                tooltip: 'Running pods on this node per namespace',
                format: 'count',
              }),
            ]),
        perGroup('restarts', {
          key: 'restarts',
          title: `Container restarts by ${label}`,
          tooltip: `Increase in kube_pod_container_status_restarts_total per ${label} on this node`,
          format: 'count',
        }),
        perGroup('oomKills', {
          key: 'oom-kills',
          title: `OOM kills by ${label}`,
          tooltip: `container_oom_events_total increase per ${label} on this node`,
          format: 'count',
        }),
      ],
    },
    {
      key: 'cpu',
      title: 'CPU',
      description: `Usage, reservations, and efficiency per ${label}`,
      graphs: [
        perGroup('cpu', {
          key: 'cpu',
          title: `CPU usage by ${label} (cores)`,
          tooltip: `container_cpu_usage_seconds_total rate per ${label} on this node`,
          format: 'cpu',
        }),
        efficiency('cpu', 'CPU', 'CPU usage'),
        perGroup('cpuRequests', {
          key: 'cpu-requests',
          title: `CPU requests by ${label} (cores)`,
          tooltip: `kube-state-metrics cpu requests per ${label} on this node`,
          format: 'cpu',
        }),
        perGroup('cpuLimits', {
          key: 'cpu-limits',
          title: `CPU limits by ${label} (cores)`,
          tooltip: `kube-state-metrics cpu limits per ${label} on this node`,
          format: 'cpu',
        }),
      ],
    },
    {
      key: 'memory',
      title: 'Memory',
      description: `Working set, reservations, and efficiency per ${label}`,
      graphs: [
        perGroup('memory', {
          key: 'memory',
          title: `Memory working set by ${label} (bytes)`,
          tooltip: `container_memory_working_set_bytes per ${label} on this node`,
          format: 'memory',
        }),
        efficiency('memory', 'Memory', 'Memory working set'),
        perGroup('memoryRequests', {
          key: 'memory-requests',
          title: `Memory requests by ${label} (bytes)`,
          tooltip: `kube-state-metrics memory requests per ${label} on this node`,
          format: 'memory',
        }),
        perGroup('memoryLimits', {
          key: 'memory-limits',
          title: `Memory limits by ${label} (bytes)`,
          tooltip: `kube-state-metrics memory limits per ${label} on this node`,
          format: 'memory',
        }),
      ],
    },
  ]
}

/**
 * The dashboard layout for a grouping; each graph fetches its own `fields`. Host disk and
 * network counters have no pod dimension, so those sections only show ungrouped.
 */
export function nodeMetricSections(
  grouping: NodeMetricsGrouping = NodeMetricsGrouping.Node,
  { limit = DEFAULT_TOP_GROUPS } = {}
): NodeMetricSection[] {
  return grouping === NodeMetricsGrouping.Node
    ? NODE_SECTIONS
    : groupedSections(grouping, limit)
}
