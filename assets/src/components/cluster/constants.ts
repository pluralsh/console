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
  CPUCD:
    '100 - avg(irate(node_cpu_seconds_total{mode="idle",cluster=""}[5m]) * 100)',
  MemoryCD:
    '(sum(node_memory_MemTotal_bytes{job="node-exporter",cluster=""}) - sum(node_memory_MemAvailable_bytes{job="node-exporter",cluster=""})) / sum(node_memory_MemTotal_bytes{job="node-exporter",cluster=""})',
  Memory:
    '1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=""}) / sum(node_memory_MemTotal_bytes{job="node-exporter",cluster=""})',
  CPURequests:
    'sum(namespace_cpu:kube_pod_container_resource_requests:sum{cluster=""})',
  CPURequestsCD:
    'sum(kube_pod_container_resource_requests{unit="core",cluster=""})',
  MemoryRequests:
    'sum(namespace_memory:kube_pod_container_resource_requests:sum{cluster=""})',
  MemoryRequestsCD:
    'sum(kube_pod_container_resource_requests{unit="byte",cluster=""})',
  CPULimits:
    'sum(namespace_cpu:kube_pod_container_resource_limits:sum{cluster=""})',
  CPULimitsCD:
    'sum(kube_pod_container_resource_limits{unit="core",cluster=""})',
  MemoryLimits:
    'sum(namespace_memory:kube_pod_container_resource_limits:sum{cluster=""})',
  MemoryLimitsCD:
    'sum(kube_pod_container_resource_limits{unit="byte",cluster=""})',
  Pods: 'count(kube_pod_info)',
  PodsCD: 'count(kube_pod_info{cluster=""})',
  CPUUsage: 'sum(rate (container_cpu_usage_seconds_total{image!=""}[5m]))',
  CPUUsageCD:
    'sum(rate (container_cpu_usage_seconds_total{image!="",cluster=""}[5m]))',
  MemUsage: 'sum(container_memory_working_set_bytes{image!=""})',
  MemUsageCD: 'sum(container_memory_working_set_bytes{image!="",cluster=""})',
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
