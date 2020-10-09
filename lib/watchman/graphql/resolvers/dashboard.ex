defmodule Watchman.GraphQl.Resolvers.Dashboard do
  alias Watchman.Kube.{Client, Dashboard}
  alias Prometheus.Client, as: PrometheusClient

  @default_offset 30 * 60

  def resolve_dashboards(%{repo: name}, _) do
    with {:ok, %{items: items}} <- Client.list_dashboards(name),
      do: {:ok, items}
  end

  def resolve_dashboard(%{repo: name, name: id} = args, _) do
    with {:ok, dash} <- Client.get_dashboard(name, id) do
      {:ok, hydrate(dash, Map.get(args, :labels, []), Map.get(args, :offset, @default_offset))}
    end
  end

  def hydrate(%Dashboard{
    spec: %Dashboard.Spec{
      labels: labels,
      graphs: graphs,
    } = spec
  } = dashboard, variables \\ [], start \\ 30 * 60, step \\ "1m") do
    [labels, graphs] =
      [
        Task.async(fn -> hydrate_labels(labels) end),
        Task.async(fn -> hydrate_graphs(graphs, variables, start, step) end)
      ]
      |> Enum.map(&Task.await/1)
    put_in(dashboard.spec, %{spec | labels: labels, graphs: graphs})
  end

  defp hydrate_labels(labels) do
    labels
    |> Task.async_stream(fn
      %Dashboard.Label{values: [_ | _]} = l -> l
      %Dashboard.Label{query: %{query: query, label: label}} = l ->
        labels = PrometheusClient.extract_labels(query, label)
        %{l | values: labels}
    end, max_concurrency: 10)
    |> Enum.map(fn {:ok, res} -> res end)
  end

  defp hydrate_graphs(graphs, variables, start, step) do
    graphs
    |> Task.async_stream(fn %Dashboard.Graph{queries: queries} = graph ->
      %{graph | queries: hydrate_queries(queries, variables, start, step)}
    end, max_concurrency: 5)
    |> Enum.map(fn {:ok, res} -> res end)
  end

  defp hydrate_queries(queries, variables, start, step) do
    queries
    |> Task.async_stream(fn %Dashboard.Query{query: q} = query ->
      with {:ok, %{data: %{result: [%{values: values} | _]}}} <- PrometheusClient.query(q, start, step, variables) do
        values
        |> IO.inspect()
        |> Enum.map(fn [ts, value] -> %{timestamp: ts, value: value} end)
        |> add_results(query)
      else
        _ -> add_results([], query)
      end
    end, max_concurrency: 5)
    |> Enum.map(fn {:ok, res} -> res end)
  end

  defp add_results(results, query), do: Map.put(query, :results, results)
end