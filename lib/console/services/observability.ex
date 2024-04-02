defmodule Console.Services.Observability do
  import Kube.Utils, only: [metadata: 1]
  alias Kube.{Client, Dashboard, VerticalPodAutoscaler}
  alias Prometheus.Client, as: PrometheusClient
  alias Loki.Client, as: LokiClient
  alias Console.Schema.DeploymentSettings.Connection
  alias Kazan.Apis.Autoscaling.V1.CrossVersionObjectReference

  @obs_conn :obs_conn

  def put_connection(scope, %Connection{} = connection), do: Process.put({@obs_conn, scope}, connection)
  def put_connection(_, _), do: :ok

  def get_connection(scope), do: Process.get({@obs_conn, scope})

  def get_dashboards(name) do
    with {:ok, %{items: items}} <- Client.list_dashboards(name),
      do: {:ok, items}
  end

  def get_dashboard(name, id), do: Client.get_dashboard(name, id)

  def get_logs(%{} = structured, start, stop, limit) do
    parse_structured_query(structured)
    |> get_logs(start, stop, limit)
  end

  def get_logs(q, start, stop, limit) do
    client = get_connection(:loki)
    with {:ok, %{data: %{result: results}}} <- LokiClient.query(client, q, start, stop, limit),
      do: {:ok, results}
  end

  defp parse_structured_query(%{labels: labels} = query) do
    label = Enum.map(labels, &label_filter/1) |> Enum.join(",")
    "{#{label}}#{loki_filter(query[:filter])}"
  end

  defp label_filter(%{name: n, value: v, regex: true}), do: "#{n}=~\"#{v}\""
  defp label_filter(%{name: n, value: v}), do: "#{n}=\"#{v}\""

  defp loki_filter(%{regex: true, text: t}), do: " |~ #{t}"
  defp loki_filter(%{text: t}), do: " |= #{t}"
  defp loki_filter(_), do: ""

  def get_metric(q, start, stop, step) do
    client = get_connection(:prometheus)
    with {:ok, %{data: %{result: results}}} <- PrometheusClient.query(client, q, start, stop, step, %{}),
      do: {:ok, results}
  end

  def get_scaling_recommendation(kind, namespace, name) do
    vpa_name = vpa_name(kind, namespace, name)
    case Client.get_vertical_pod_autoscaler(namespace, vpa_name) do
      {:ok, result} -> {:ok, result}
      _ ->
        vpa_template(kind, name, vpa_name)
        |> Client.create_vertical_pod_autoscaler(namespace)
    end
  end

  defp vpa_template(kind, name, vpa_name) do
    %VerticalPodAutoscaler{
      metadata: metadata(vpa_name),
      spec: %VerticalPodAutoscaler.Spec{
        update_policy: %VerticalPodAutoscaler.Spec.UpdatePolicy{update_mode: "Off"},
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
      %Dashboard.Spec.Labels{values: [_ | _]} = l -> l
      %Dashboard.Spec.Labels{query: %{query: query, label: label}} = l ->
        labels = PrometheusClient.extract_labels(query, label)
        %{l | values: labels}
    end, max_concurrency: 10)
    |> Enum.map(fn {:ok, res} -> res end)
  end

  defp hydrate_graphs(graphs, variables, start, now, step) do
    graphs
    |> Task.async_stream(fn %Dashboard.Spec.Graphs{queries: queries} = graph ->
      %{graph | queries: hydrate_queries(queries, variables, start, now, step)}
    end, max_concurrency: 5)
    |> Enum.map(fn {:ok, res} -> res end)
  end

  defp hydrate_queries(queries, variables, start, now, step) do
    queries
    |> Task.async_stream(fn
      %Dashboard.Spec.Graphs.Queries{legend_format: f} = query when is_binary(f) ->
        format_query(query, start, now, step, variables)
      %Dashboard.Spec.Graphs.Queries{} = query ->
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
