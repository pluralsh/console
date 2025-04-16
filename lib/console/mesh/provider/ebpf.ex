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

  require Logger

  defstruct [:prom, :cluster]

  @queries [
    bytes_sent: ~s/avg(rate(tcp.bytes{cluster="$cluster"$additional}[5m]))/,
    bytes_received: ~s/avg(rate(tcp.bytes{cluster="$cluster"$additional}[5m]))/,
    packets: ~s/avg(rate(tcp.packets{cluster="$cluster"$additional}[5m]))/,
    # http: ~s/avg(rate(http.status_code{cluster="$cluster"$additional}[[5m])) by (status_code)/,
    connections: ~s/avg(rate(tcp.active{direction="inbound",cluster="$cluster"$additional}[5m]))/,
  ]

  def new(prom, cluster) do
    %__MODULE__{prom: prom, cluster: cluster}
  end

  def graph(%__MODULE__{cluster: cluster, prom: prom}, opts) do
    {namespace, opts} = Keyword.pop(opts, :namespace)
    additional = namespace_filter(namespace)

    Enum.reduce_while(@queries, Builder.new(), fn {metric, query}, b ->
      case Console.Mesh.Prometheus.query(prom, format_query(query, cluster, additional), opts) |> IO.inspect() do
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
    Builder.add(b, edge(metric, %Result{metric: m, value: [ts, val]}))
  end
  defp add_result(_, _, b), do: b

  defp edge(metric, %Result{metric: m, value: [_ , val]}) do
    source_id = "#{m["source.workload.name"]}:#{m["source.workload.namespace"]}"
    dest_id = "#{m["destination.workload.name"]}:#{m["destination.workload.namespace"]}"
    %Edge{
      id: "#{source_id}.#{dest_id}",
      from: %Workload{
        id: source_id,
        name: m["source.workload.name"],
        namespace: m["source.workload.namespace"],
        service: m["source.container.name"]
      },
      to: %Workload{
        id: dest_id,
        name: m["destination.workload.name"],
        namespace: m["destination.workload.namespace"],
        service: m["destination.container.name"]
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
