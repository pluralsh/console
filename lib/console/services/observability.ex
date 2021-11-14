defmodule Console.Services.Observability do
  alias Kube.{Client, Dashboard, VerticalPodAutoscaler}
  alias Prometheus.Client, as: PrometheusClient
  alias Loki.Client, as: LokiClient
  alias Kazan.Apis.Autoscaling.V1.CrossVersionObjectReference

  def get_dashboards(name) do
    with {:ok, %{items: items}} <- Client.list_dashboards(name),
      do: {:ok, items}
  end

  def get_dashboard(name, id), do: Client.get_dashboard(name, id)

  def get_logs(q, start, stop, limit) do
    with {:ok, %{data: %{result: results}}} <- LokiClient.query(q, start, stop, limit),
      do: {:ok, results}
  end

  def get_metric(q, start, stop, step) do
    with {:ok, %{data: %{result: results}}} <- PrometheusClient.query(q, start, stop, step, %{}),
      do: {:ok, results}
  end

  def get_scaling_recommendation(kind, namespace, name) do
    vpa_name = vpa_name(kind, namespace, name)
    case Client.get_vertical_pod_autoscaler(namespace, vpa_name) do
      {:ok, result} -> {:ok, result}
      _ -> Client.create_vertical_pod_autoscaler(namespace, vpa_name, vpa_template(kind, namespace, name))
    end
  end

  defp vpa_template(kind, namespace, name) do
    %VerticalPodAutoscaler{
      spec: %VerticalPodAutoscaler.Spec{
        update_policy: %VerticalPodAutoscaler.UpdatePolicy{update_mode: "Off"},
        target_ref: %CrossVersionObjectReference{
          api_version: "apps/v1",
          kind: to_string(kind),
          name: name
        }
      }
    }
  end

  defp vpa_name(:statefulset, namespace, name), do: "ss-#{namespace}-#{name}"
  defp vpa_name(:deployment, namespace, name), do: "dep-#{namespace}-#{name}"

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

  defp add_results(results, query) do
    Map.put(query, :results, Enum.filter(results, & &1.value != "NaN"))
  end
end
