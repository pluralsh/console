defmodule Console.Mesh.Provider.Cilium do
  @moduledoc """
  A provider for Cilium.
  """

  @behaviour Console.Mesh.Provider
  alias Console.Mesh.Provider.Utils
  alias Console.Schema.{Cluster}
  alias Console.Mesh.{Edge, Workload, Statistics}
  alias Prometheus.{Result}

  require Logger

  defstruct [:prom, :cluster]

  @queries [
    bytes: ~s/sum(cilium_forward_bytes_total{direction="EGRESS",cluster="$cluster"$additional})/,
    connections: ~s/sum(hubble_flows_processed_total{cluster="$cluster"$additional})/,
    http200: ~s/sum(hubble_http_requests_total{status="200",cluster="$cluster"$additional})/,
    http400: ~s/sum(hubble_http_requests_total{status="400",cluster="$cluster"$additional})/,
    http500: ~s/sum(hubble_http_requests_total{status="500",cluster="$cluster"$additional})/,
    http_client_latency: ~s/histogram_quantile(0.95, sum(rate(hubble_http_request_duration_ms_bucket{status="200",cluster="$cluster"$additional}[5m])) by (le, dst_deployment, dst_namespace))/,
  ]

  def new(prom, cluster) do
    %__MODULE__{prom: prom, cluster: cluster}
  end

  def graph(%__MODULE__{cluster: cluster, prom: prom}, opts) do
    {namespace, opts} = Keyword.pop(opts, :namespace)
    additional = namespace_filter(namespace)

    Enum.map(@queries, fn {m, q} -> {m, format_query(q, cluster, additional)} end)
    |> Utils.build_graph(prom, &edge/2, opts)
  end

  defp edge(metric, %Result{metric: m, value: [_ , val]}) do
    source_id = "#{m["source.workload.name"]}.#{m["source.namespace.name"]}"
    dest_id   = "#{m["dest.workload.name"]}.#{m["dest.namespace.name"]}"

    %Edge{
      id: "#{source_id}.#{dest_id}",
      from: %Workload{
        id: source_id,
        name: m["source.workload.name"],
        namespace: m["source.namespace.name"],
        service: m["source.service.name"]
      },
      to: %Workload{
        id: dest_id,
        name: m["dest.workload.name"],
        namespace: m["dest.namespace.name"],
        service: m["dest.service.name"],
      },
      statistics: struct(Statistics, %{metric => val})
    }
  end
  defp edge(_, b), do: b

  defp format_query(query, %Cluster{handle: h}, additional),
    do: Prometheus.Client.variable_subst(query, cluster: h, additional: additional)

  defp namespace_filter(ns) when is_binary(ns), do: ",source.namespace.name=\"#{ns}\""
  defp namespace_filter(_), do: ""
end
