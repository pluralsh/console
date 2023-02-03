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
  CPU: 'sum (rate (container_cpu_usage_seconds_total{image!=""}[5m])) / sum (machine_cpu_cores)',
  Memory: 'sum (container_memory_working_set_bytes{image!=""}) / sum (machine_memory_bytes)',
  CPURequests: 'sum(kube_pod_container_resource_requests{resource="cpu"})',
  MemoryRequests: 'sum(kube_pod_container_resource_requests{resource="memory"})',
  CPULimits: 'sum(kube_pod_container_resource_limits{resource="cpu"})',
  MemoryLimits: 'sum(kube_pod_container_resource_limits{resource="memory"})',
  Pods: 'count(kube_pod_info)',
  CPUUsage: 'sum(rate (container_cpu_usage_seconds_total{image!=""}[5m]))',
  MemUsage: 'sum(container_memory_working_set_bytes{image!=""})',
} as const

export const NodeMetrics = {
  CPU: 'sum (rate (container_cpu_usage_seconds_total{image!="", node="{instance}"}[5m])) / sum (machine_cpu_cores{node="{instance}"})',
  Memory: 'sum (container_memory_working_set_bytes{image!="", node="{instance}"}) / sum (machine_memory_bytes{node="{instance}"})',
  CPUUsage: 'sum(rate (container_cpu_usage_seconds_total{image!="", node="{instance}"}[5m]))',
  MemUsage: 'sum(container_memory_working_set_bytes{image!="", node="{instance}"})',
} as const
