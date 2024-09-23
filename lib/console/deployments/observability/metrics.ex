defmodule Console.Deployments.Observability.Metrics do
  @moduledoc """
  Parameterized PromQL queries for observability data w/in the Plural Console
  """
  import Console.Deployments.Observability.Utils

  @cluster post_process([
    cpu: '1 - avg(irate(node_cpu_seconds_total{mode="idle",cluster="$cluster"}[5m]))',
    memory: '(sum(node_memory_MemTotal_bytes{cluster="$cluster"}) - sum(node_memory_MemAvailable_bytes{cluster="$cluster"})) / sum(node_memory_MemTotal_bytes{cluster="$cluster"})',
    cpu_requests: 'sum(kube_pod_container_resource_requests{unit="core",cluster="$cluster"})',
    memory_requests: 'sum(kube_pod_container_resource_requests{unit="byte",cluster="$cluster"})',
    cpu_limits: 'sum(kube_pod_container_resource_limits{unit="core",cluster="$cluster"})',
    memory_limits: 'sum(kube_pod_container_resource_limits{unit="byte",cluster="$cluster"})',
    pods: 'count(kube_pod_info{cluster="$cluster"})',
    cpu_usage: 'sum(rate (container_cpu_usage_seconds_total{image!="",container!="",cluster="$cluster"}[5m]))',
    memory_usage: 'sum(container_memory_working_set_bytes{image!="",cluster="$cluster",container!=""})'
  ])

  @node post_process([
    cpu: 'sum (rate (container_cpu_usage_seconds_total{image!="",container!="",cluster="$cluster",node="$instance"}[5m])) / sum (machine_cpu_cores{node="$instance",cluster="$cluster"})',
    memory: 'sum (container_memory_working_set_bytes{image!="",container!="",node="$instance",cluster="$cluster"}) / sum (machine_memory_bytes{node="$instance",cluster="$cluster"})',
    cpu_usage: 'sum(rate(container_cpu_usage_seconds_total{image!="",container!="",node="$instance",cluster="$cluster"}[5m]))',
    memory_usage: 'sum(container_memory_working_set_bytes{image!="",container!="",node="$instance"})'
  ])

  @component post_process([
    cpu: 'sum(rate(container_cpu_usage_seconds_total{image!="",container!="",cluster="$cluster",namespace="$namespace",pod=~"$name$regex"}[5m]))',
    mem: 'sum(container_memory_working_set_bytes{cluster="$cluster",namespace="$namespace",pod=~"$name$regex",image!="",container!=""})',
    pod_cpu: 'sum(rate(container_cpu_usage_seconds_total{image!="",container!="",cluster="$cluster",namespace="$namespace",pod=~"$name$regex"}[5m])) by (pod)',
    pod_mem: 'sum(container_memory_working_set_bytes{cluster="$cluster",namespace="$namespace",pod=~"$name$regex",image!="",container!=""}) by (pod)'
  ])

  def queries(:cluster), do: @cluster
  def queries(:node), do: @node
  def queries(:component), do: @component
end
