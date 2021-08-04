export const POLL_INTERVAL = 10 * 1000

export const EventType = {
  Normal: "Normal",
  Warning: "Warning"
}

export const ClusterMetrics = {
  CPU: 'sum (rate (container_cpu_usage_seconds_total{id="/"}[5m])) / sum (machine_cpu_cores)',
  Memory: 'sum (container_memory_working_set_bytes{id="/"}) / sum (machine_memory_bytes)',
  CPURequests: 'sum(kube_pod_container_resource_requests{resource="cpu"})',
  MemoryRequests: 'sum(kube_pod_container_resource_requests{resource="memory"})',
  CPULimits: 'sum(kube_pod_container_resource_limits{resource="cpu"})',
  MemoryLimits: 'sum(kube_pod_container_resource_limits{resource="memory"})',
  Pods: 'count(kube_pod_info)',
  CPUUsage: 'sum(rate (container_cpu_usage_seconds_total{id="/"}[5m]))',
  MemUsage: 'sum(container_memory_working_set_bytes{id="/"})',
}

export const NodeMetrics = {
  CPU: 'sum (rate (container_cpu_usage_seconds_total{id="/", node="{instance}"}[5m])) / sum (machine_cpu_cores{node="{instance}"})',
  Memory: 'sum (container_memory_working_set_bytes{id="/", node="{instance}"}) / sum (machine_memory_bytes{node="{instance}"})',
  CPUUsage: 'sum(rate (container_cpu_usage_seconds_total{id="/", node="{instance}"}[5m]))',
  MemUsage: 'sum(container_memory_working_set_bytes{id="/", node="{instance}"})',
}