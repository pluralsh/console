defmodule Console.Deployments.Observability.Metrics do
  @moduledoc """
  Parameterized PromQL queries for observability data w/in the Plural Console
  """
  import Console.Deployments.Observability.Utils

  @cluster post_process([
    cpu: ~s|1 - avg(irate(node_cpu_seconds_total{mode="idle",cluster="$cluster"}[5m]))|,
    memory: ~s|(sum(node_memory_MemTotal_bytes{cluster="$cluster"}) - sum(node_memory_MemAvailable_bytes{cluster="$cluster"})) / sum(node_memory_MemTotal_bytes{cluster="$cluster"})|,
    cpu_requests: ~s|sum(kube_pod_container_resource_requests{unit="core",cluster="$cluster"})|,
    memory_requests: ~s|sum(kube_pod_container_resource_requests{unit="byte",cluster="$cluster"})|,
    cpu_limits: ~s|sum(kube_pod_container_resource_limits{unit="core",cluster="$cluster"})|,
    memory_limits: ~s|sum(kube_pod_container_resource_limits{unit="byte",cluster="$cluster"})|,
    pods: ~s|count(kube_pod_info{cluster="$cluster"})|,
    cpu_usage: ~s|sum(rate (container_cpu_usage_seconds_total{container!="",cluster="$cluster"}[5m]))|,
    memory_usage: ~s|sum(container_memory_working_set_bytes{image!="",cluster="$cluster",container!=""})|
  ])

  @node post_process([
    cpu: ~s|sum (rate (container_cpu_usage_seconds_total{container!="",cluster="$cluster",node="$instance"}[5m])) / sum (machine_cpu_cores{node="$instance",cluster="$cluster"})|,
    memory: ~s|sum (container_memory_working_set_bytes{image!="",container!="",node="$instance",cluster="$cluster"}) / sum (machine_memory_bytes{node="$instance",cluster="$cluster"})|,
    cpu_usage: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",node="$instance",cluster="$cluster"}[5m]))|,
    memory_usage: ~s|sum(container_memory_working_set_bytes{image!="",container!="",node="$instance"})|
  ])

  @component post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="$cluster",namespace="$namespace",pod=~"$name$regex"}[5m]))|,
    mem: ~s|sum(container_memory_working_set_bytes{cluster="$cluster",namespace="$namespace",pod=~"$name$regex",image!="",container!=""})|,
    pod_cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="$cluster",namespace="$namespace",pod=~"$name$regex"}[5m])) by (pod)|,
    pod_mem: ~s|sum(container_memory_working_set_bytes{cluster="$cluster",namespace="$namespace",pod=~"$name$regex",image!="",container!=""}) by (pod)|
  ])

  @heat post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="$cluster"$filter}[5m])) by (pod)|,
    memory: ~s|sum(container_memory_working_set_bytes{cluster="$cluster"$filter,image!="",container!=""}) by (pod)|
  ])

  @heat_ns post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="$cluster"$filter}[5m])) by (namespace)|,
    memory: ~s|sum(container_memory_working_set_bytes{cluster="$cluster"$filter,image!="",container!=""}) by (namespace)|
  ])

  @heat_node post_process([
    cpu: ~s|sum(rate(container_cpu_usage_seconds_total{container!="",cluster="$cluster"$filter}[5m])) by (node)|,
    memory: ~s|sum(container_memory_working_set_bytes{cluster="$cluster"$filter,image!="",container!=""$filter}) by (node)|
  ])

  def queries(:cluster), do: @cluster
  def queries(:node), do: @node
  def queries(:component), do: @component
  def queries(:heat, :pod), do: @heat
  def queries(:heat, :namespace), do: @heat_ns
  def queries(:heat, :node), do: @heat_node
end
