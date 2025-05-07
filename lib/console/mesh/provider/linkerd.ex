defmodule Console.Mesh.Provider.Linkerd do
  @moduledoc """
  Implementation for linkerd, for the most part all this data is actually accessible via the prometheus.
  Just extract it and use the graph builder module to gradually build the graph since the metrics are
  spread across separate prometheus metrics entirely.
  """

  @behaviour Console.Mesh.Provider
  alias Console.Mesh.Provider.Utils
  alias Console.Schema.{Cluster}
  alias Console.Mesh.{Edge, Workload, Statistics}
  alias Prometheus.{Result}

  require Logger

  defstruct [:prom, :cluster]

  # Reference: https://linkerd.io/2.12/reference/proxy-metrics/
  @queries [
    bytes: ~s/rate(tcp_write_bytes_total{direction="inbound",cluster="$cluster"$additional}[5m])/,
    connections: ~s/rate(tcp_open_total{direction="inbound",cluster="$cluster"$additional}[5m])/,
    http200: ~s/rate(response_total{classification="success",direction="inbound",cluster="$cluster"$additional}[5m])/,
    http400: ~s/rate(response_total{status_code=~"4..",direction="inbound",cluster="$cluster"$additional}[5m])/,
    http500: ~s/rate(response_total{status_code=~"5..",direction="inbound",cluster="$cluster"$additional}[5m])/,
    http_client_latency: ~s/histogram_quantile(0.95, sum(rate(response_latency_ms_bucket{direction="inbound",cluster="$cluster"$additional}[5m])) by (le, dst_deployment, dst_namespace))/,
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
    source_id = "#{m["deployment"]}:#{m["namespace"]}"
    dest_id   = "#{m["dst_deployment"]}:#{m["dst_namespace"]}"

    %Edge{
      id: "#{source_id}.#{dest_id}",
      from: %Workload{
        id:        source_id,
        name:      m["deployment"],
        namespace: m["namespace"],
        service:   m["service"] || m["deployment"]
      },
      to: %Workload{
        id:        dest_id,
        name:      m["dst_deployment"],
        namespace: m["dst_namespace"],
        service:   m["dst_service"] || m["dst_deployment"]
      },
      statistics: struct(Statistics, %{metric => val})
    }
  end
  defp edge(_, b), do: b

  defp format_query(query, %Cluster{handle: h}, additional),
    do: Prometheus.Client.variable_subst(query, cluster: h, additional: additional)

  defp namespace_filter(ns) when is_binary(ns), do: ",namespace=\"#{ns}\""
  defp namespace_filter(_), do: ""
end
