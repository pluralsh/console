defmodule Watchman.Services.Observability do
  alias Watchman.Kube.{Client, Dashboard}
  alias Prometheus.Client, as: PrometheusClient
  alias Loki.Client, as: LokiClient

  def get_dashboards(name) do
    with {:ok, %{items: items}} <- Client.list_dashboards(name),
      do: {:ok, items}
  end

  def get_dashboard(name, id), do: Client.get_dashboard(name, id)

  def get_logs(q, start, stop, limit) do
    with {:ok, %{data: %{result: results}}} <- LokiClient.query(q, start, stop, limit),
      do: {:ok, results}
  end

  def hydrate(%Dashboard{
    spec: %Dashboard.Spec{
      labels: labels,
      graphs: graphs,
    } = spec
  } = dashboard, variables, start, now, step \\ "1m") do
    [labels, graphs] =
      [
        Task.async(fn -> hydrate_labels(labels) end),
        Task.async(fn -> hydrate_graphs(graphs, variables, start, now, step) end)
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

  defp hydrate_graphs(graphs, variables, start, now, step) do
    graphs
    |> Task.async_stream(fn %Dashboard.Graph{queries: queries} = graph ->
      %{graph | queries: hydrate_queries(queries, variables, start, now, step)}
    end, max_concurrency: 5)
    |> Enum.map(fn {:ok, res} -> res end)
  end

  defp hydrate_queries(queries, variables, start, now, step) do
    queries
    |> Task.async_stream(fn
      %Dashboard.Query{legend_format: f} = query when is_binary(f) ->
        format_query(query, start, now, step, variables)
      %Dashboard.Query{} = query ->
        [single_query(query, start, now, step, variables)]
    end, max_concurrency: 5)
    |> Enum.flat_map(fn {:ok, res} -> res end)
  end

  defp single_query(%{query: q} = query, start, now, step, variables) do
    with {:ok, %{data: %{result: [%{values: values} | _]}}} <- PrometheusClient.query(q, start, now, step, variables) do
      values
      |> Enum.map(fn [ts, value] -> %{timestamp: ts, value: value} end)
      |> add_results(query)
    else
      _ -> add_results([], query)
    end
  end


  defp format_query(%{query: q, legend_format: legend} = query, start, now, step, variables) do
    with {:ok, %{data: %{result: results}}} <- PrometheusClient.query(q, start, now, step, variables) do
      results
      |> Enum.map(fn %{metric: metric, values: values} ->
        values
        |> Enum.map(fn [ts, value] -> %{timestamp: ts, value: value} end)
        |> add_results(query)
        |> Map.put(:legend, substitute(legend, metric))
      end)
    else
      _ -> [add_results([], %{query | legend: legend})]
    end
  end

  defp substitute(legend, labels) do
    Enum.reduce(labels, legend, fn {k, v}, str ->
      String.replace(str, "$#{k}", v)
    end)
  end

  defp add_results(results, query), do: Map.put(query, :results, results)
end