defmodule Console.Mesh.Provider.Istio do
  @moduledoc """
  Implementation for istio, for the most part all this data is actually accessible via the prometheus.
  Just extract it and use the graph builder module to gradually build the graph since the metrics are
  spread across separate prometheus metrics entirely.
  """
  @behaviour Console.Mesh.Provider
  alias Console.Schema.{Cluster}
  alias Console.Mesh.{Builder, Edge, Workload, Statistics}
  alias Prometheus.{Response, Data, Result}

  require Logger

  defstruct [:prom, :cluster]

  @queries [
    bytes_sent: ~s/avg(rate(istio_tcp_sent_bytes_total{cluster="$cluster"$additional}[5m]))/,
    bytes_received: ~s/avg(rate(istio_tcp_received_bytes_total{cluster="$cluster"$additional}[5m]))/,
    connections: ~s/avg(rate(istio_tcp_connections_opened_total{direction="inbound",cluster="$cluster"$additional}[5m]))/,
  ]

  def new(prom, cluster) do
    %__MODULE__{prom: prom, cluster: cluster}
  end

  def graph(%__MODULE__{cluster: cluster, prom: prom}, opts) do
    {namespace, opts} = Keyword.pop(opts, :namespace)
    additional = namespace_filter(namespace)

    Enum.reduce_while(@queries, Builder.new(), fn {metric, query}, b ->
      case Console.Mesh.Prometheus.query(prom, format_query(query, cluster, additional), opts) do
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

  defp add_result(metric, %Result{metric: m, values: [ts, val]}, b) do
    Builder.add(b, edge(metric, %Result{metric: m, values: [ts, val]}))
  end
  defp add_result(_, _, b), do: b

  defp edge(metric, %Result{metric: m, values: [_ , val]}) do
    source_id = "#{m["source_workload"]}:#{m["source_workload_namespace"]}"
    dest_id = "#{m["destination_workload"]}:#{m["destination_workload_namespace"]}"
    %Edge{
      id: "#{source_id}.#{dest_id}",
      from: %Workload{
        id: source_id,
        name: m["source_workload"],
        namespace: m["source_workload_namespace"],
        service: m["source_service"]
      },
      to: %Workload{
        id: dest_id,
        name: m["destination_workload"],
        namespace: m["destination_workload_namespace"],
        service: m["destination_service"]
      },
      statistics: struct(Statistics, %{metric => val})
    }
  end
  defp edge(_, b), do: b

  defp format_query(query, %Cluster{handle: h}, additional),
    do: Prometheus.Client.variable_subst(query, cluster: h, additional: additional)

  defp namespace_filter(ns) when is_binary(ns), do: ",source_workload_namespace=\"#{ns}\""
  defp namespace_filter(_), do: ""
end
