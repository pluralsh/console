export const POLL_INTERVAL = 10 * 1000
export const SHORT_POLL_INTERVAL = 3 * 1000

export const COMPONENT_LABEL = 'platform.plural.sh/component'
export const KIND_LABEL = 'platform.plural.sh/kind'
export const RESOURCE_LABEL = 'platform.plural.sh/resource'

export type EventType = 'Normal' | 'Warning'
export const EventTypes = {
  Normal: 'Normal',
  Warning: 'Warning',
} as const satisfies Record<EventType, EventType>

export type ScalingType = 'DEPLOYMENT' | 'STATEFULSET'
export const ScalingTypes = {
  DEPLOYMENT: 'DEPLOYMENT',
  STATEFULSET: 'STATEFULSET',
} as const satisfies Record<ScalingType, ScalingType>

export const ClusterMetrics = {
  CPU: 'cluster:node_cpu:ratio_rate5m{cluster=""}',
  Memory:
    '1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=""}) / sum(node_memory_MemTotal_bytes{job="node-exporter",cluster=""})',
  CPURequests:
    'sum(namespace_cpu:kube_pod_container_resource_requests:sum{cluster=""})',
  MemoryRequests:
    'sum(namespace_memory:kube_pod_container_resource_requests:sum{cluster=""})',
  CPULimits:
    'sum(namespace_cpu:kube_pod_container_resource_limits:sum{cluster=""})',
  MemoryLimits:
    'sum(namespace_memory:kube_pod_container_resource_limits:sum{cluster=""})',
  Pods: 'count(kube_pod_info)',
  CPUUsage: 'sum(rate (container_cpu_usage_seconds_total{image!=""}[5m]))',
  MemUsage: 'sum(container_memory_working_set_bytes{image!=""})',
} as const

export const NodeMetrics = {
  CPU: 'sum (rate (container_cpu_usage_seconds_total{image!="", node="{instance}"}[5m])) / sum (machine_cpu_cores{node="{instance}"})',
  Memory:
    'sum (container_memory_working_set_bytes{image!="", node="{instance}"}) / sum (machine_memory_bytes{node="{instance}"})',
  CPUUsage:
    'sum(rate (container_cpu_usage_seconds_total{image!="", node="{instance}"}[5m]))',
  MemUsage:
    'sum(container_memory_working_set_bytes{image!="", node="{instance}"})',
} as const
