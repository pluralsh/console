import {
  type ClusterMetricGraph,
  type ClusterMetricSection,
  dashed,
  DEFAULT_TOP_GROUPS,
  divide,
  first,
  type Group,
  groupsOf,
  type Metrics,
  ratioByGroup,
  solid,
  sumByGroup,
  topGroups,
  type UsageField,
} from 'components/cd/cluster/metrics/clusterMetricsGraphs'
import { ServiceMetricsGrouping } from 'generated/graphql'

type Resource = 'cpu' | 'memory'

const RESOURCES: Record<
  Resource,
  { name: string; usage: string; format: 'cpu' | 'memory' }
> = {
  cpu: { name: 'CPU', usage: 'CPU usage', format: 'cpu' },
  memory: { name: 'Memory', usage: 'Memory working set', format: 'memory' },
}

const total = (metrics: Metrics) => sumByGroup(null, metrics)[0]?.data ?? []

const ratio = (
  resource: Resource,
  against: 'Requests' | 'Limits'
): Omit<ClusterMetricGraph, 'series'> => {
  const { name, usage } = RESOURCES[resource]
  return against === 'Requests'
    ? {
        key: `${resource}-efficiency`,
        title: `${name} request efficiency`,
        tooltip: `${usage} as a share of requested ${resource}. Well below 100% means the reservation is mostly idle.`,
        format: 'percent',
        fields: [resource, `${resource}Requests`],
      }
    : {
        key: `${resource}-limit-utilization`,
        title: `${name} limit utilization`,
        tooltip: `${usage} as a share of the ${resource} limit. Nearing 100% means ${resource === 'cpu' ? 'throttling' : 'OOM kills'}.`,
        format: 'percent',
        fields: [resource, `${resource}Limits`],
      }
}

function totalSections(): ClusterMetricSection[] {
  const resource = (r: Resource, last: ClusterMetricGraph) => {
    const { name, format } = RESOURCES[r]
    const requests: UsageField = `${r}Requests`
    const limits: UsageField = `${r}Limits`
    return {
      key: r,
      title: name,
      graphs: [
        {
          key: r,
          title: `${name} usage`,
          tooltip: `${RESOURCES[r].usage} across the service's namespace, against kube-state-metrics requests and limits`,
          format,
          fields: [r, requests, limits],
          series: (m) => [
            ...solid('usage', first(m[r])),
            ...dashed('requests', first(m[requests])),
            ...dashed('limits', first(m[limits])),
          ],
        },
        {
          ...ratio(r, 'Requests'),
          series: (m) =>
            solid('usage', divide(first(m[r]), first(m[requests]))),
        },
        {
          ...ratio(r, 'Limits'),
          series: (m) => solid('usage', divide(first(m[r]), first(m[limits]))),
        },
        last,
      ],
    } satisfies ClusterMetricSection
  }

  return [
    resource('cpu', {
      key: 'cpu-throttling',
      title: 'CPU throttling',
      tooltip:
        'Share of CFS periods in which containers were throttled for hitting their cpu limit',
      format: 'percent',
      fields: ['cpuThrottling'],
      series: (m) => solid('throttled', first(m.cpuThrottling)),
    }),
    resource('memory', {
      key: 'oom-kills',
      title: 'OOM kills',
      tooltip: 'Containers killed for exceeding their memory limit',
      format: 'count',
      fields: ['oomKills'],
      series: (m) => solid('oom kills', first(m.oomKills)),
    }),
    {
      key: 'network',
      title: 'Network',
      graphs: [
        {
          key: 'network',
          title: 'Network throughput',
          tooltip: 'Pod network receive and transmit rates',
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
          tooltip: 'Pod received and transmitted packets dropped per second',
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
          key: 'volume-fullness',
          title: 'Fullest persistent volume',
          tooltip:
            'Used share of capacity for the service’s fullest persistent volume claim',
          format: 'percent',
          fields: ['volumeFullness'],
          series: (m) => solid('fullest volume', first(m.volumeFullness)),
        },
        {
          key: 'volumes',
          title: 'Persistent volumes (bytes)',
          tooltip: 'Used bytes against capacity across the service’s claims',
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
          tooltip: 'Container writable-layer and emptyDir usage',
          format: 'memory',
          fields: ['ephemeralStorage'],
          series: (m) => solid('usage', first(m.ephemeralStorage)),
        },
        {
          key: 'fs-io',
          title: 'Filesystem I/O',
          tooltip: 'Container filesystem read and write rates',
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
          tooltip: 'Running and pending pods in the service’s namespace',
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
          tooltip: 'Container restarts within each rate window',
          format: 'count',
          fields: ['restarts'],
          series: (m) => solid('restarts', first(m.restarts)),
        },
      ],
    },
  ]
}

function podSections(limit: number): ClusterMetricSection[] {
  const top = (groups: Group[], additive = true, noun = 'pods') =>
    topGroups(groups, { limit, additive, noun })

  const perGroup = (
    field: UsageField,
    graph: Omit<ClusterMetricGraph, 'fields' | 'series'>,
    {
      label = 'pod',
      noun = 'pods',
      additive = true,
    }: { label?: string; noun?: string; additive?: boolean } = {}
  ): ClusterMetricGraph => ({
    ...graph,
    fields: [field],
    series: (m) => top(groupsOf(m[field], label), additive, noun),
  })

  const ratioByPod = (
    r: Resource,
    against: 'Requests' | 'Limits'
  ): ClusterMetricGraph => {
    const graph = ratio(r, against)
    const denominator: UsageField = `${r}${against}`
    return {
      ...graph,
      title: `${graph.title} by pod`,
      series: (m) => top(ratioByGroup(m[r], m[denominator], 'pod'), false),
    }
  }

  const volumes = { label: 'persistentvolumeclaim', noun: 'claims' }

  return [
    {
      key: 'cpu',
      title: 'CPU',
      graphs: [
        perGroup('cpu', {
          key: 'cpu',
          title: 'CPU usage by pod (cores)',
          tooltip: 'container_cpu_usage_seconds_total rate summed per pod',
          format: 'cpu',
        }),
        ratioByPod('cpu', 'Requests'),
        ratioByPod('cpu', 'Limits'),
        perGroup(
          'cpuThrottling',
          {
            key: 'cpu-throttling',
            title: 'CPU throttling by pod',
            tooltip: 'Share of CFS periods throttled per pod',
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
          title: 'Memory working set by pod (bytes)',
          tooltip: 'container_memory_working_set_bytes summed per pod',
          format: 'memory',
        }),
        ratioByPod('memory', 'Requests'),
        ratioByPod('memory', 'Limits'),
        perGroup('oomKills', {
          key: 'oom-kills',
          title: 'OOM kills by pod',
          tooltip: 'container_oom_events_total increase per pod',
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
          title: 'Network receive by pod',
          tooltip: 'container_network_receive_bytes_total rate per pod',
          format: 'bytesRate',
        }),
        perGroup('networkTransmit', {
          key: 'network-transmit',
          title: 'Network transmit by pod',
          tooltip: 'container_network_transmit_bytes_total rate per pod',
          format: 'bytesRate',
        }),
        perGroup('networkReceiveDropped', {
          key: 'network-receive-dropped',
          title: 'Received packets dropped by pod',
          tooltip:
            'container_network_receive_packets_dropped_total rate per pod',
          format: 'rate',
        }),
        perGroup('networkTransmitDropped', {
          key: 'network-transmit-dropped',
          title: 'Transmitted packets dropped by pod',
          tooltip:
            'container_network_transmit_packets_dropped_total rate per pod',
          format: 'rate',
        }),
      ],
    },
    {
      key: 'storage',
      title: 'Storage',
      graphs: [
        perGroup(
          'volumeFullness',
          {
            key: 'volume-fullness',
            title: 'Persistent volume fullness by claim',
            tooltip:
              'Used share of capacity per persistent volume claim (volume stats carry no pod label)',
            format: 'percent',
          },
          { ...volumes, additive: false }
        ),
        perGroup(
          'volumeUsage',
          {
            key: 'volumes',
            title: 'Persistent volume usage by claim (bytes)',
            tooltip: 'kubelet_volume_stats_used_bytes per claim',
            format: 'memory',
          },
          volumes
        ),
        perGroup('ephemeralStorage', {
          key: 'ephemeral',
          title: 'Ephemeral storage by pod (bytes)',
          tooltip: 'container_fs_usage_bytes summed per pod',
          format: 'memory',
        }),
        {
          key: 'fs-io',
          title: 'Filesystem I/O by pod',
          tooltip: 'Container filesystem read and write rates combined per pod',
          format: 'bytesRate',
          fields: ['fsReads', 'fsWrites'],
          series: (m) => top(sumByGroup('pod', m.fsReads, m.fsWrites)),
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
          tooltip: 'Running and pending pods in the service’s namespace',
          format: 'count',
          fields: ['podsRunning', 'podsPending'],
          series: (m) => [
            ...solid('running', total(m.podsRunning)),
            ...dashed('pending', total(m.podsPending)),
          ],
        },
        perGroup('restarts', {
          key: 'restarts',
          title: 'Container restarts by pod',
          tooltip: 'Container restarts within each rate window, per pod',
          format: 'count',
        }),
      ],
    },
  ]
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  cpu: 'Usage, request efficiency, limit headroom, and throttling',
  memory: 'Working set, request efficiency, limit headroom, and OOM kills',
  network: 'Pod throughput and dropped packets',
  storage:
    'Volume fullness, persistent and ephemeral usage, and filesystem I/O',
  workloads: 'Pod scheduling and container restarts',
}

/** The service metrics layout; each graph fetches only its own `fields`. */
export function serviceMetricSections(
  grouping: ServiceMetricsGrouping,
  { limit = DEFAULT_TOP_GROUPS } = {}
): ClusterMetricSection[] {
  const sections =
    grouping === ServiceMetricsGrouping.Pod
      ? podSections(limit)
      : totalSections()
  return sections.map((section) => ({
    ...section,
    description: SECTION_DESCRIPTIONS[section.key],
  }))
}
