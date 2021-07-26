export const POLL_INTERVAL = 10 * 1000

export const EventType = {
  Normal: "Normal",
  Warning: "Warning"
}

export const ClusterMetrics = {
  CPU: 'sum (rate (container_cpu_usage_seconds_total{id="/"}[5m])) / sum (machine_cpu_cores)',
  Memory: 'sum (container_memory_working_set_bytes{id="/"}) / sum (machine_memory_bytes)',
  CPURequests: 'sum(kube_pod_container_resource_requests{resource="cpu"})',
  MemoryRequests: 'sum(kube_pod_container_resource_requests{resource="memory"})'
}