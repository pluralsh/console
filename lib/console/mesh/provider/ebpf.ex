defmodule Console.Mesh.Provider.Ebpf do
  @moduledoc """
  Implementation for istio, for the most part all this data is actually accessible via the prometheus.
  Just extract it and use the graph builder module to gradually build the graph since the metrics are
  spread across separate prometheus metrics entirely.
  """
  @behaviour Console.Mesh.Provider
  alias Console.Schema.{Cluster}
  alias Console.Mesh.{Builder, Edge, Workload, Statistics}
  alias Prometheus.{Response, Data, Result}
  alias Console.Mesh.Prometheus, as: Prom

  require Logger

  defstruct [:prom, :cluster]

  @queries [
    bytes: ~s/rate(tcp.bytes{cluster="$cluster"$additional}[5m])/,
    packets: ~s/rate(tcp.packets{cluster="$cluster"$additional}[5m])/,
    http_200: ~s/rate(http.status_code{status_code="200",cluster="$cluster"$additional}[[5m])/,
    http_400: ~s/rate(http.status_code{status_code="400",cluster="$cluster"$additional}[[5m])/,
    http_500: ~s/rate(http.status_code{status_code="500",cluster="$cluster"$additional}[[5m])/,
    http_client_latency: ~s/rate(http.client.duration_average{cluster="$cluster"$additional}[5m])/,
    connections: ~s/avg(tcp.active{direction="inbound",cluster="$cluster"$additional}[5m]) by (source.workload.name, source.namespace.name, dest.workload.name, dest.namespace.name)/,
  ]

  def new(prom, cluster) do
    %__MODULE__{prom: prom, cluster: cluster}
  end

  def graph(%__MODULE__{cluster: cluster, prom: prom}, opts) do
    {namespace, opts} = Keyword.pop(opts, :namespace)
    additional = namespace_filter(namespace)

    Enum.reduce_while(@queries, Builder.new(), fn {metric, query}, b ->
      case Prom.query(prom, format_query(query, cluster, additional), opts) do
        {:ok, %Response{data: %Data{result: results}}} ->
          {:cont, Enum.reduce(results, b, &add_result(metric, &1, &2))}
        err ->
          Logger.warning "failed to fetch istio prometheus metrics: #{inspect(err)}"
          {:halt, err}
      end
    end)
    |> case do
      %Builder{} = builder -> {:ok, Builder.render(builder)}
      err -> {:error, "prometheus error fetching istio metrics: #{inspect(err)}"}
    end
  end

  defp add_result(metric, %Result{metric: m, value: [ts, val]}, b) do
    Builder.add(b, edge(metric, %Result{metric: m, value: [ts, Prom.value(val)]}))
  end
  defp add_result(_, _, b), do: b

  defp edge(metric, %Result{metric: m, value: [_ , val]}) do
    source_id = "#{m["source.workload.name"]}:#{m["source.namespace.name"]}"
    dest_id = "#{m["dest.workload.name"]}:#{m["dest.namespace.name"]}"
    %Edge{
      id: "#{source_id}.#{dest_id}",
      from: %Workload{
        id: source_id,
        name: m["source.workload.name"],
        namespace: m["source.namespace.name"],
        service: m["source.container.name"]
      },
      to: %Workload{
        id: dest_id,
        name: m["dest.workload.name"],
        namespace: m["dest.namespace.name"],
        service: m["dest.container.name"]
      },
      statistics: struct(Statistics, %{metric => val})
    }
  end
  defp edge(_, b), do: b

  defp format_query(query, %Cluster{handle: h}, additional),
    do: Prometheus.Client.variable_subst(query, cluster: h, additional: additional)

  defp namespace_filter(ns) when is_binary(ns), do: ",source.workload.namespace=\"#{ns}\""
  defp namespace_filter(_), do: ""
end
