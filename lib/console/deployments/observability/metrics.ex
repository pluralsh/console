defmodule Console.Deployments.Observability.Metrics do
  @moduledoc """
  Parameterized PromQL queries for observability data w/in the Plural Console
  """
  import Console.Deployments.Observability.Utils

  @component_selector ~s|cluster="${cluster}",namespace="${namespace}",pod=~"${name}${regex}"|
  @service_selector ~s|cluster="${cluster}",namespace="${namespace}"|
  @pod_selector ~s|cluster="${cluster}",namespace="${namespace}",pod="${name}"|

  @cluster post_process([
    cpu: ~s|1 - avg(irate(node_cpu_seconds_total{mode="idle",cluster="${cluster}"}[${rate}]))|,
    memory: ~s|(sum(node_memory_MemTotal_bytes{cluster="${cluster}"}) - sum(node_memory_MemAvailable_bytes{cluster="${cluster}"})) / sum(node_memory_MemTotal_bytes{cluster="${cluster}"})|,
    cpu_requests: reservation(:requests, :cpu, ~s|cluster="${cluster}"|),
    memory_requests: reservation(:requests, :memory, ~s|cluster="${cluster}"|),
    cpu_limits: reservation(:limits, :cpu, ~s|cluster="${cluster}"|),
    memory_limits: reservation(:limits, :memory, ~s|cluster="${cluster}"|),
    pods: ~s|count(kube_pod_info{cluster="${cluster}"})|,
    cpu_usage: ~s|sum(rate (container_cpu_usage_seconds_total{container!="",cluster="${cluster}"}[${rate}]))|,
    memory_usage: ~s|sum(container_memory_working_set_bytes{image!="",cluster="${cluster}",container!=""})|
  ])

  @node post_process([
    cpu: ~s|sum (rate (container_cpu_usage_seconds_total{container!="",cluster="${cluster}",node="${instance}"}[${rate}])) / sum (machine_cpu_cores{node="${instance}",cluster="${cluster}"})|,
    memory: ~s|sum (container_memory_working_set_bytes{image!="",container!="",node="${instance}",cluster="${cluster}"}) / sum (machine_memory_bytes{node="${instance}",cluster="${cluster}"})|,
    cpu_usage: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",node="${instance}",cluster="${cluster}"}[${rate}]))|,
    memory_usage: ~s|sum(container_memory_working_set_bytes{image!="",container!="",node="${instance}"})|
  ])

  @component post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="${cluster}",namespace="${namespace}",pod=~"${name}${regex}"}[${rate}]))|,
    mem: ~s|sum(container_memory_working_set_bytes{cluster="${cluster}",namespace="${namespace}",pod=~"${name}${regex}",image!="",container!=""})|,
    pod_cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="${cluster}",namespace="${namespace}",pod=~"${name}${regex}"}[${rate}])) by (pod)|,
    pod_mem: ~s|sum(container_memory_working_set_bytes{cluster="${cluster}",namespace="${namespace}",pod=~"${name}${regex}",image!="",container!=""}) by (pod)|,
    cpu_requests: reservation(:requests, :cpu, @component_selector),
    mem_requests: reservation(:requests, :memory, @component_selector),
    cpu_limits: reservation(:limits, :cpu, @component_selector),
    mem_limits: reservation(:limits, :memory, @component_selector),
    pod_cpu_requests: reservation(:requests, :cpu, @component_selector, "pod"),
    pod_mem_requests: reservation(:requests, :memory, @component_selector, "pod"),
    pod_cpu_limits: reservation(:limits, :cpu, @component_selector, "pod"),
    pod_mem_limits: reservation(:limits, :memory, @component_selector, "pod")
  ])

  @service post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="${cluster}",namespace="${namespace}"}[${rate}]))|,
    mem: ~s|sum(container_memory_working_set_bytes{cluster="${cluster}",namespace="${namespace}",image!="",container!=""})|,
    pod_cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="${cluster}",namespace="${namespace}"}[${rate}])) by (pod)|,
    pod_mem: ~s|sum(container_memory_working_set_bytes{cluster="${cluster}",namespace="${namespace}",image!="",container!=""}) by (pod)|,
    cpu_requests: reservation(:requests, :cpu, @service_selector),
    mem_requests: reservation(:requests, :memory, @service_selector),
    cpu_limits: reservation(:limits, :cpu, @service_selector),
    mem_limits: reservation(:limits, :memory, @service_selector),
    pod_cpu_requests: reservation(:requests, :cpu, @service_selector, "pod"),
    pod_mem_requests: reservation(:requests, :memory, @service_selector, "pod"),
    pod_cpu_limits: reservation(:limits, :cpu, @service_selector, "pod"),
    pod_mem_limits: reservation(:limits, :memory, @service_selector, "pod")
  ])

  # container-scoped series exclude the pause container ("POD" on dockershim, "" on the pod cgroup);
  # cAdvisor only reports network stats on the pod sandbox, so those stay pod-wide
  @pod_container ~s|container!="",container!="POD",#{@pod_selector}|

  @pod post_process([
    cpu: ~s|sum by (container) (rate(container_cpu_usage_seconds_total{#{@pod_container}}[${rate}]))|,
    cpu_requests: reservation(:requests, :cpu, @pod_selector, "container"),
    cpu_limits: reservation(:limits, :cpu, @pod_selector, "container"),
    cpu_throttling: ~s|sum by (container) (rate(container_cpu_cfs_throttled_periods_total{#{@pod_container}}[${rate}])) / sum by (container) (rate(container_cpu_cfs_periods_total{#{@pod_container}}[${rate}]))|,
    memory: ~s|sum by (container) (container_memory_working_set_bytes{image!="",#{@pod_container}})|,
    memory_requests: reservation(:requests, :memory, @pod_selector, "container"),
    memory_limits: reservation(:limits, :memory, @pod_selector, "container"),
    ephemeral_storage: ~s|sum by (container) (container_fs_usage_bytes{#{@pod_container}})|,
    ephemeral_storage_requests: reservation(:requests, :ephemeral_storage, @pod_selector, "container"),
    ephemeral_storage_limits: reservation(:limits, :ephemeral_storage, @pod_selector, "container"),
    fs_reads: ~s|sum by (container) (rate(container_fs_reads_bytes_total{#{@pod_container}}[${rate}]))|,
    fs_writes: ~s|sum by (container) (rate(container_fs_writes_bytes_total{#{@pod_container}}[${rate}]))|,
    network_receive: ~s|sum(rate(container_network_receive_bytes_total{#{@pod_selector}}[${rate}]))|,
    network_transmit: ~s|sum(rate(container_network_transmit_bytes_total{#{@pod_selector}}[${rate}]))|,
    network_receive_dropped: ~s|sum(rate(container_network_receive_packets_dropped_total{#{@pod_selector}}[${rate}]))|,
    network_transmit_dropped: ~s|sum(rate(container_network_transmit_packets_dropped_total{#{@pod_selector}}[${rate}]))|,
    restarts: ~s|max by (container) (kube_pod_container_status_restarts_total{#{@pod_selector}})|
  ])

  @heat post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="${cluster}"${filter}}[${rate}])) by (pod)|,
    memory: ~s|sum(container_memory_working_set_bytes{cluster="${cluster}"${filter},image!="",container!=""}) by (pod)|
  ])

  @heat_ns post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="${cluster}"${filter}}[${rate}])) by (namespace)|,
    memory: ~s|sum(container_memory_working_set_bytes{cluster="${cluster}"${filter},image!="",container!=""}) by (namespace)|
  ])

  @heat_node post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="${cluster}"${filter}}[${rate}])) by (node)|,
    memory: ~s|sum(container_memory_working_set_bytes{cluster="${cluster}"${filter},image!="",container!=""}) by (node)|
  ])

  @noisy post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="${cluster}"}[${rate}])) / sum(kube_pod_container_resource_requests_cpu_cores{cluster="${cluster}"}) by (pod)|,
    memory: ~s|sum(container_memory_working_set_bytes{cluster="${cluster}",image!="",container!=""}) / sum(kube_pod_container_resource_requests_memory_bytes{cluster="${cluster}"}) by (pod)|
  ])

  def queries(:cluster), do: @cluster
  def queries(:node), do: @node
  def queries(:component), do: @component
  def queries(:service), do: @service
  def queries(:pod), do: @pod
  def queries(:noisy), do: @noisy

  def queries(:heat, :pod), do: @heat
  def queries(:heat, :namespace), do: @heat_ns
  def queries(:heat, :node), do: @heat_node

  def queries(:cluster_usage, grouping) when grouping in [:cluster, :namespace, :node],
    do: cluster_usage(grouping)

  @cluster_selector ~s|cluster="${cluster}"|

  # cluster-wide timeseries, each broken out by `grouping` (`:cluster` is a single total series)
  defp cluster_usage(grouping) do
    by = group_label(grouping)
    sel = @cluster_selector

    [
      cpu: sum_by(by, ~s|rate(container_cpu_usage_seconds_total{container!="",#{sel}}[${rate}])|),
      cpu_requests: reservation(:requests, :cpu, sel, by),
      cpu_limits: reservation(:limits, :cpu, sel, by),
      cpu_allocatable: allocatable(grouping, :cpu),
      cpu_throttling: ~s|#{sum_by(by, ~s|rate(container_cpu_cfs_throttled_periods_total{container!="",#{sel}}[${rate}])|)} / #{sum_by(by, ~s|rate(container_cpu_cfs_periods_total{container!="",#{sel}}[${rate}])|)}|,
      memory: sum_by(by, ~s|container_memory_working_set_bytes{image!="",container!="",#{sel}}|),
      memory_requests: reservation(:requests, :memory, sel, by),
      memory_limits: reservation(:limits, :memory, sel, by),
      memory_allocatable: allocatable(grouping, :memory),
      oom_kills: sum_by(by, ~s|increase(container_oom_events_total{container!="",#{sel}}[${rate}])|),
      network_receive: sum_by(by, ~s|rate(container_network_receive_bytes_total{namespace!="",#{sel}}[${rate}])|),
      network_transmit: sum_by(by, ~s|rate(container_network_transmit_bytes_total{namespace!="",#{sel}}[${rate}])|),
      network_receive_dropped: sum_by(by, ~s|rate(container_network_receive_packets_dropped_total{namespace!="",#{sel}}[${rate}])|),
      network_transmit_dropped: sum_by(by, ~s|rate(container_network_transmit_packets_dropped_total{namespace!="",#{sel}}[${rate}])|),
      ephemeral_storage: sum_by(by, ~s|container_fs_usage_bytes{container!="",#{sel}}|),
      fs_reads: sum_by(by, ~s|rate(container_fs_reads_bytes_total{container!="",#{sel}}[${rate}])|),
      fs_writes: sum_by(by, ~s|rate(container_fs_writes_bytes_total{container!="",#{sel}}[${rate}])|),
      volume_usage: sum_by(by, ~s|kubelet_volume_stats_used_bytes{#{sel}}|),
      volume_capacity: sum_by(by, ~s|kubelet_volume_stats_capacity_bytes{#{sel}}|),
      pods_running: pod_scoped(by, ~s|max by (namespace, pod) (kube_pod_status_phase{phase="Running",#{sel}})|),
      pods_pending: pod_scoped(by, ~s|max by (namespace, pod) (kube_pod_status_phase{phase="Pending",#{sel}})|),
      restarts: pod_scoped(by, ~s|max by (namespace, pod, container) (increase(kube_pod_container_status_restarts_total{#{sel}}[${rate}]))|)
    ]
    |> Enum.reject(fn {_, query} -> is_nil(query) end)
    |> post_process()
  end

  defp group_label(:cluster), do: ""
  defp group_label(grouping), do: Atom.to_string(grouping)

  defp sum_by(by, expr), do: "sum by (#{by}) (#{expr})"

  # kube-state-metrics pod series carry no node label, so borrow it from kube_pod_info
  defp pod_scoped("node", expr),
    do: ~s|sum by (node) (#{expr} * on (namespace, pod) group_left (node) max by (namespace, pod, node) (kube_pod_info{#{@cluster_selector}}))|
  defp pod_scoped(by, expr), do: sum_by(by, expr)

  # node allocatable has no namespace dimension
  defp allocatable(:namespace, _), do: nil
  defp allocatable(grouping, resource) do
    unit = if resource == :cpu, do: "core", else: "byte"
    sum_by(group_label(grouping), ~s|max by (node) (kube_node_status_allocatable{resource="#{resource}",unit="#{unit}",#{@cluster_selector}})|)
  end
end
