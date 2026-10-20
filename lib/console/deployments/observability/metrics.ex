defmodule Console.Deployments.Observability.Metrics do
  @moduledoc """
  Parameterized PromQL queries for observability data w/in the Plural Console
  """
  import Console.Deployments.Observability.Utils

  @component_selector ~s|cluster="${cluster}",namespace="${namespace}",pod=~"${name}${regex}"|
  @service_selector ~s|cluster="${cluster}",namespace="${namespace}"|
  @pod_selector ~s|cluster="${cluster}",namespace="${namespace}",pod="${name}"|

  # node-exporter isn't always scraped (k8s-monitoring only does with `hostMetrics.linuxHosts`), so host
  # cpu and memory fall back to the kubelet's resource metrics against kube-state-metrics node capacity
  @cluster_capacity_cpu ~s|sum(max by (node) (kube_node_status_capacity{resource="cpu",unit="core",cluster="${cluster}"}))|
  @cluster_capacity_memory ~s|sum(max by (node) (kube_node_status_capacity{resource="memory",unit="byte",cluster="${cluster}"}))|

  @cluster post_process([
    cpu: ~s|(1 - avg(irate(node_cpu_seconds_total{mode="idle",cluster="${cluster}"}[${rate}]))) or (sum(max by (node) (rate(node_cpu_usage_seconds_total{cluster="${cluster}"}[${rate}]))) / #{@cluster_capacity_cpu})|,
    memory: ~s|((sum(node_memory_MemTotal_bytes{cluster="${cluster}"}) - sum(node_memory_MemAvailable_bytes{cluster="${cluster}"})) / sum(node_memory_MemTotal_bytes{cluster="${cluster}"})) or (sum(max by (node) (node_memory_working_set_bytes{cluster="${cluster}"})) / #{@cluster_capacity_memory})|,
    cpu_requests: reservation(:requests, :cpu, ~s|cluster="${cluster}"|),
    memory_requests: reservation(:requests, :memory, ~s|cluster="${cluster}"|),
    cpu_limits: reservation(:limits, :cpu, ~s|cluster="${cluster}"|),
    memory_limits: reservation(:limits, :memory, ~s|cluster="${cluster}"|),
    pods: ~s|count(kube_pod_info{cluster="${cluster}"})|,
    cpu_usage: ~s|sum(rate (container_cpu_usage_seconds_total{container!="",cluster="${cluster}"}[${rate}]))|,
    memory_usage: ~s|sum(container_memory_working_set_bytes{image!="",cluster="${cluster}",container!=""})|
  ])

  # k8s-monitoring's default cAdvisor allowlist drops machine_cpu_cores
  @instance_selector ~s|cluster="${cluster}",node="${instance}"|
  @instance_cores ~s|(max(machine_cpu_cores{#{@instance_selector}}) or max(kube_node_status_capacity{resource="cpu",unit="core",#{@instance_selector}}))|
  @instance_memory ~s|(max(machine_memory_bytes{#{@instance_selector}}) or max(kube_node_status_capacity{resource="memory",unit="byte",#{@instance_selector}}))|

  @node post_process([
    cpu: ~s|sum (rate (container_cpu_usage_seconds_total{container!="",#{@instance_selector}}[${rate}])) / #{@instance_cores}|,
    memory: ~s|sum (container_memory_working_set_bytes{image!="",container!="",#{@instance_selector}}) / #{@instance_memory}|,
    cpu_usage: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",#{@instance_selector}}[${rate}]))|,
    memory_usage: ~s|sum(container_memory_working_set_bytes{image!="",container!="",#{@instance_selector}})|
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

  # Shippers label node-exporter series with the node name differently: grafana's k8s-monitoring
  # sets `instance` to it, kube-prometheus-stack adds `nodename`, victoria-metrics' stack adds
  # `node`, and bare scrape configs only have node_uname_info's `nodename` to join through (which
  # k8s-monitoring's default allowlist drops).  Failing all of those, a host-network node-exporter's
  # `ip:port` instance matches the node's internal ip in kube_node_info.  Each is tried, keyed by instance.
  @node_instances [
                    ~s|node_cpu_seconds_total{mode="idle",cluster="${cluster}",instance="${node}"}|,
                    ~s|node_cpu_seconds_total{mode="idle",cluster="${cluster}",nodename="${node}"}|,
                    ~s|node_cpu_seconds_total{mode="idle",cluster="${cluster}",node="${node}"}|,
                    ~s|node_uname_info{cluster="${cluster}",nodename="${node}"}|,
                    ~s|(label_replace(node_cpu_seconds_total{mode="idle",cluster="${cluster}"}, "internal_ip", "$1", "instance", "(.+):[0-9]+") and on (internal_ip) kube_node_info{cluster="${cluster}",node="${node}"})|
                  ]
                  |> Enum.join(" or ")
  @node_exporter ~s|and on (instance) max by (instance) (#{@node_instances})|
  @node_selector ~s|cluster="${cluster}",node="${node}"|
  @node_capacity_cpu ~s|max(kube_node_status_capacity{resource="cpu",unit="core",#{@node_selector}})|
  @host_fs ~s<fstype!~"tmpfs|overlay|squashfs|ramfs|nsfs|fuse.*",mountpoint!~"/(run|var/lib/kubelet)/.*",cluster="${cluster}">
  # physical interfaces only; virtual pod and overlay interfaces double count pod traffic
  @host_nic ~s<device!~"lo|veth.*|cali.*|cilium.*|lxc.*|flannel.*|cni.*|docker.*|br-.*|tunl.*|vxlan.*|genev.*|kube-.*|eni.*|gke.*|azv.*",cluster="${cluster}">
  @node_pods ~s|on (namespace, pod) group_left () max by (namespace, pod) (kube_pod_info{#{@node_selector}})|

  # host-level series that no pod or namespace grouping applies to.  Without node-exporter, cpu and
  # memory fall back to the kubelet's resource metrics and kube-state-metrics node capacity; the
  # rest have no equivalent and stay empty
  @node_host [
    cpu_utilization: ~s|(1 - avg(rate(node_cpu_seconds_total{mode="idle",cluster="${cluster}"}[${rate}]) #{@node_exporter})) or (max(rate(node_cpu_usage_seconds_total{#{@node_selector}}[${rate}])) / #{@node_capacity_cpu})|,
    cpu_modes: ~s|sum by (mode) (rate(node_cpu_seconds_total{mode!="idle",cluster="${cluster}"}[${rate}]) #{@node_exporter}) / scalar(count(node_cpu_seconds_total{mode="idle",cluster="${cluster}"} #{@node_exporter}))|,
    cpu_cores: ~s|count(node_cpu_seconds_total{mode="idle",cluster="${cluster}"} #{@node_exporter}) or max(machine_cpu_cores{#{@node_selector}}) or #{@node_capacity_cpu}|,
    load1: ~s|max(node_load1{cluster="${cluster}"} #{@node_exporter})|,
    load5: ~s|max(node_load5{cluster="${cluster}"} #{@node_exporter})|,
    load15: ~s|max(node_load15{cluster="${cluster}"} #{@node_exporter})|,
    memory_total: ~s|max(node_memory_MemTotal_bytes{cluster="${cluster}"} #{@node_exporter}) or max(machine_memory_bytes{#{@node_selector}}) or max(kube_node_status_capacity{resource="memory",unit="byte",#{@node_selector}})|,
    memory_used: ~s|max((node_memory_MemTotal_bytes{cluster="${cluster}"} - node_memory_MemAvailable_bytes{cluster="${cluster}"}) #{@node_exporter}) or max(node_memory_working_set_bytes{#{@node_selector}})|,
    memory_cached: ~s|max((node_memory_Cached_bytes{cluster="${cluster}"} + node_memory_Buffers_bytes{cluster="${cluster}"}) #{@node_exporter})|,
    major_page_faults: ~s|max(rate(node_vmstat_pgmajfault{cluster="${cluster}"}[${rate}]) #{@node_exporter})|,
    filesystem_fullness: ~s|max by (mountpoint) ((1 - node_filesystem_avail_bytes{#{@host_fs}} / node_filesystem_size_bytes{#{@host_fs}}) #{@node_exporter})|,
    disk_read: ~s|sum(rate(node_disk_read_bytes_total{cluster="${cluster}"}[${rate}]) #{@node_exporter})|,
    disk_write: ~s|sum(rate(node_disk_written_bytes_total{cluster="${cluster}"}[${rate}]) #{@node_exporter})|,
    disk_busy: ~s|max(rate(node_disk_io_time_seconds_total{cluster="${cluster}"}[${rate}]) #{@node_exporter})|,
    network_receive: ~s|sum(rate(node_network_receive_bytes_total{#{@host_nic}}[${rate}]) #{@node_exporter})|,
    network_transmit: ~s|sum(rate(node_network_transmit_bytes_total{#{@host_nic}}[${rate}]) #{@node_exporter})|,
    network_errors: ~s|sum(rate(node_network_receive_errs_total{#{@host_nic}}[${rate}]) #{@node_exporter}) + sum(rate(node_network_transmit_errs_total{#{@host_nic}}[${rate}]) #{@node_exporter})|,
    network_dropped: ~s|sum(rate(node_network_receive_drop_total{#{@host_nic}}[${rate}]) #{@node_exporter}) + sum(rate(node_network_transmit_drop_total{#{@host_nic}}[${rate}]) #{@node_exporter})|,

    cpu_allocatable: ~s|max(kube_node_status_allocatable{resource="cpu",unit="core",#{@node_selector}})|,
    memory_allocatable: ~s|max(kube_node_status_allocatable{resource="memory",unit="byte",#{@node_selector}})|,
    pods_allocatable: ~s|max(kube_node_status_allocatable{resource="pods",#{@node_selector}})|,
    conditions: ~s|max by (condition) (kube_node_status_condition{status="true",#{@node_selector}})|
  ]

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

  def queries(:service_usage, grouping) when grouping in [:service, :pod],
    do: service_usage(grouping)

  def queries(:node_usage, grouping) when grouping in [:node, :namespace, :pod],
    do: node_usage(grouping)

  # a node's host series plus its pods' usage and reservations, the latter broken out by
  # `grouping` (`:node` is a single total series)
  defp node_usage(grouping) do
    by = node_group_label(grouping)

    post_process(@node_host ++ [
      cpu: sum_by(by, ~s|rate(container_cpu_usage_seconds_total{container!="",#{@node_selector}}[${rate}])|),
      cpu_requests: reservation(:requests, :cpu, @node_selector, by),
      cpu_limits: reservation(:limits, :cpu, @node_selector, by),
      memory: sum_by(by, ~s|container_memory_working_set_bytes{image!="",container!="",#{@node_selector}}|),
      memory_requests: reservation(:requests, :memory, @node_selector, by),
      memory_limits: reservation(:limits, :memory, @node_selector, by),
      oom_kills: sum_by(by, ~s|increase(container_oom_events_total{container!="",#{@node_selector}}[${rate}])|),
      pods_running: sum_by(by, ~s|max by (namespace, pod) (kube_pod_status_phase{phase="Running",cluster="${cluster}"}) * #{@node_pods}|),
      restarts: sum_by(by, ~s|max by (namespace, pod, container) (increase(kube_pod_container_status_restarts_total{cluster="${cluster}"}[${rate}])) * #{@node_pods}|)
    ])
  end

  defp node_group_label(:node), do: ""
  defp node_group_label(:namespace), do: "namespace"
  # pod names only stay unique within a namespace
  defp node_group_label(:pod), do: "namespace, pod"

  @cluster_selector ~s|cluster="${cluster}"|

  # cluster-wide timeseries, each broken out by `grouping` (`:cluster` is a single total series)
  defp cluster_usage(grouping) do
    by = group_label(grouping)

    usage(@cluster_selector, by, by)
    |> Keyword.merge(cpu_allocatable: allocatable(grouping, :cpu), memory_allocatable: allocatable(grouping, :memory))
    |> Enum.reject(fn {_, query} -> is_nil(query) end)
    |> post_process()
  end

  # the same timeseries scoped to a service's namespace; kubelet volume stats carry no pod
  # label, so per-pod views break volumes out by claim instead
  defp service_usage(:service), do: post_process(usage(@service_selector, "", ""))
  defp service_usage(:pod), do: post_process(usage(@service_selector, "pod", "persistentvolumeclaim"))

  defp usage(sel, by, volume_by) do
    [
      cpu: sum_by(by, ~s|rate(container_cpu_usage_seconds_total{container!="",#{sel}}[${rate}])|),
      cpu_requests: reservation(:requests, :cpu, sel, by),
      cpu_limits: reservation(:limits, :cpu, sel, by),
      cpu_throttling: ~s|#{sum_by(by, ~s|rate(container_cpu_cfs_throttled_periods_total{container!="",#{sel}}[${rate}])|)} / #{sum_by(by, ~s|rate(container_cpu_cfs_periods_total{container!="",#{sel}}[${rate}])|)}|,
      memory: sum_by(by, ~s|container_memory_working_set_bytes{image!="",container!="",#{sel}}|),
      memory_requests: reservation(:requests, :memory, sel, by),
      memory_limits: reservation(:limits, :memory, sel, by),
      oom_kills: sum_by(by, ~s|increase(container_oom_events_total{container!="",#{sel}}[${rate}])|),
      network_receive: sum_by(by, ~s|rate(container_network_receive_bytes_total{namespace!="",#{sel}}[${rate}])|),
      network_transmit: sum_by(by, ~s|rate(container_network_transmit_bytes_total{namespace!="",#{sel}}[${rate}])|),
      network_receive_dropped: sum_by(by, ~s|rate(container_network_receive_packets_dropped_total{namespace!="",#{sel}}[${rate}])|),
      network_transmit_dropped: sum_by(by, ~s|rate(container_network_transmit_packets_dropped_total{namespace!="",#{sel}}[${rate}])|),
      ephemeral_storage: sum_by(by, ~s|container_fs_usage_bytes{container!="",#{sel}}|),
      fs_reads: sum_by(by, ~s|rate(container_fs_reads_bytes_total{container!="",#{sel}}[${rate}])|),
      fs_writes: sum_by(by, ~s|rate(container_fs_writes_bytes_total{container!="",#{sel}}[${rate}])|),
      volume_usage: sum_by(volume_by, ~s|kubelet_volume_stats_used_bytes{#{sel}}|),
      volume_capacity: sum_by(volume_by, ~s|kubelet_volume_stats_capacity_bytes{#{sel}}|),
      volume_fullness: ~s|max by (#{volume_by}) (kubelet_volume_stats_used_bytes{#{sel}} / kubelet_volume_stats_capacity_bytes{#{sel}})|,
      pods_running: pod_scoped(by, ~s|max by (namespace, pod) (kube_pod_status_phase{phase="Running",#{sel}})|),
      pods_pending: pod_scoped(by, ~s|max by (namespace, pod) (kube_pod_status_phase{phase="Pending",#{sel}})|),
      restarts: pod_scoped(by, ~s|max by (namespace, pod, container) (increase(kube_pod_container_status_restarts_total{#{sel}}[${rate}]))|)
    ]
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
