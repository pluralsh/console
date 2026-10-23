defmodule Console.AI.Tools.Workbench.Observability.Metrics do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.TimeRange
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{
    MetricsQueryInput,
    MetricsQueryOutput,
    MetricsSeriesOutput,
    MetricSeries,
    MetricsOptions,
    AzureMetricsOptions,
    MetricPoint
  }
  alias Console.AI.Workbench.Conversion
  alias Console.AI.Tools.Workbench.Output

  embedded_schema do
    field :tool, :map, virtual: true
    field :query, :string
    field :step,  :string

    embeds_one :options, Options, on_replace: :update, primary_key: false do
      embeds_one :azure, Azure, on_replace: :update, primary_key: false do
        field :resource_id, :string
        field :metrics_namespace, :string
        field :aggregation, :string
        field :filter, :string
        field :order_by, :string
        field :roll_up_by, :string
        field :metrics_endpoint, :string
      end
    end

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(query step)a
  @default_schema Console.priv_file!("tools/workbench/observability/metrics.json") |> Jason.decode!()
  @azure_schema Console.priv_file!("tools/workbench/observability/metrics_azure.json") |> Jason.decode!()

  def json_schema(%{tool: %{tool: :azure, configuration: %{azure: %{prometheus_url: url}}}}) when is_binary(url),
    do: @default_schema
  def json_schema(%{tool: %{tool: :azure}}), do: @azure_schema
  def json_schema(_), do: @default_schema

  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_metrics_#{n}"

  def description(%__MODULE__{tool: %{name: n} = t}), do: String.trim("Gather metrics from the #{n} observability connection. #{provider_hint(t)}")

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:options, with: &options_changeset/2)
    |> cast_embed(:time_range)
    |> TimeRange.put_default()
    |> validate_required([:query])
  end

  defp options_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:azure, with: &azure_options_changeset/2)
  end

  defp azure_options_changeset(model, attrs) do
    cast(model, attrs, ~w(resource_id metrics_namespace aggregation filter order_by roll_up_by metrics_endpoint)a)
  end

  # bounds on what a thought stores for charting, independent of the model-facing output
  @stored_series_limit 50
  @stored_sample_limit 1_000
  @non_finite_values [:nan, :infinity, :negative_infinity]
  @sample_format "[unix_seconds, value]"

  def implement(%__MODULE__{} = tool) do
    tool = TimeRange.ensure(tool)
    with :ok <- TimeRange.safe(tool.time_range),
         {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %MetricsSeriesOutput{} = output} <- Stub.metrics_series(conn, input, Client.metrics_rpc_opts()) do
      series = Enum.flat_map(output.series, &mapify_series/1)

      with {:ok, content} <- Output.json(model_output(series)) do
        {:ok, %{content: content, series: stored_series(series)}}
      end
    end
  end

  @doc """
  The model-facing encoding: labels once per series and samples as `[unix_seconds, value]`
  pairs, since repeating labels and ISO timestamps on every point dominates token usage.
  """
  def model_output(series) do
    %{
      sample_format: @sample_format,
      series: Enum.map(series, fn %{name: name, labels: labels, samples: samples} ->
        %{samples: Enum.map(samples, &[DateTime.to_unix(&1.timestamp), &1.value])}
        |> maybe_put(:name, name)
        |> maybe_put(:labels, labels)
      end)
    }
  end

  defp maybe_put(map, _, v) when v in [nil, ""] or v == %{}, do: map
  defp maybe_put(map, k, v), do: Map.put(map, k, v)

  @doc """
  Caps series stored on a thought, thinning each one evenly so a chart still spans the
  full queried range.
  """
  def stored_series(series) do
    series = Enum.take(series, @stored_series_limit)
    per_series = max(div(@stored_sample_limit, max(length(series), 1)), 2)
    Enum.map(series, &Map.update!(&1, :samples, fn samples -> thin(samples, per_series) end))
  end

  defp thin(samples, max) when length(samples) <= max, do: samples
  defp thin(samples, max) do
    last = length(samples) - 1
    indexed = List.to_tuple(samples)
    Enum.map(0..(max - 1), &elem(indexed, round(&1 * last / (max - 1))))
  end

  def structured(%__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(TimeRange.ensure(tool)),
         {:ok, %MetricsQueryOutput{} = output} <- Stub.metrics(conn, input, Client.metrics_rpc_opts()) do
      {:ok, output.metrics |> finite_metrics() |> Enum.map(&mapify/1)}
    end
  end

  @doc """
  Like `structured/1`, but grouped by series: `%{name, labels, samples: [%{timestamp, value}]}`.
  """
  def structured_series(%__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(TimeRange.ensure(tool)),
         {:ok, %MetricsSeriesOutput{} = output} <- Stub.metrics_series(conn, input, Client.metrics_rpc_opts()) do
      {:ok, Enum.flat_map(output.series, &mapify_series/1)}
    end
  end

  @doc "Expands series from `structured_series/1` into the per-point shape of `structured/1`."
  def flatten_series(series) when is_list(series) do
    Enum.flat_map(series, fn %{name: name, labels: labels, samples: samples} ->
      Enum.map(samples, &%{timestamp: &1.timestamp, name: name, value: &1.value, labels: labels})
    end)
  end

  @doc "Groups per-point metrics (the `structured/1` shape) into series, in first-seen order."
  def group_points(points) when is_list(points) do
    {order, groups} =
      Enum.reduce(points, {[], %{}}, fn point, {order, groups} ->
        key = {point.name, point.labels || %{}}
        sample = %{timestamp: point.timestamp, value: point.value}

        case groups do
          %{^key => samples} -> {order, Map.put(groups, key, [sample | samples])}
          _ -> {[key | order], Map.put(groups, key, [sample])}
        end
      end)

    order
    |> Enum.reverse()
    |> Enum.map(fn {name, labels} = key ->
      %{name: name, labels: labels, samples: Enum.reverse(groups[key])}
    end)
  end

  defp finite_metrics(metrics),
    do: Enum.reject(metrics, &(&1.value in @non_finite_values))

  defp mapify_series(%MetricSeries{samples: samples} = series) do
    case finite_metrics(samples) do
      [] -> []
      samples ->
        [%{
          name: series.name,
          labels: series.labels,
          samples: Enum.map(samples, &%{timestamp: TimeRange.to_datetime(&1.timestamp), value: &1.value})
        }]
    end
  end

  defp mapify(%MetricPoint{} = metric) do
    %{
      timestamp: TimeRange.to_datetime(metric.timestamp),
      name: metric.name,
      value: metric.value,
      labels: metric.labels,
    }
  end

  defp input(%__MODULE__{tool: tool, query: q, step: s, time_range: tr, options: options}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %MetricsQueryInput{connection: connection, query: q, step: s, range: range(tool, tr), options: metrics_options(tool, options)}}
    end
  end

  # Dynatrace carries timeframe in DQL and rejects separate range/step fields.
  defp range(%{tool: :dynatrace}, _), do: nil
  defp range(_, tr), do: TimeRange.to_proto(tr)

  defp metrics_options(%{tool: :azure} = tool, options) do
    query_azure = azure_opts(options)

    %MetricsOptions{azure: %AzureMetricsOptions{
      resource_id: resource_id(query_azure),
      metrics_namespace: Map.get(query_azure, :metrics_namespace) || "",
      aggregation: Map.get(query_azure, :aggregation),
      filter: Map.get(query_azure, :filter),
      order_by: Map.get(query_azure, :order_by),
      roll_up_by: Map.get(query_azure, :roll_up_by),
      metrics_endpoint: Map.get(query_azure, :metrics_endpoint),
      prometheus_url: azure_prom_url(tool),
    }}
  end
  defp metrics_options(_, _), do: nil

  def azure_prom_url(%{tool: :azure, configuration: %{azure: %{prometheus_url: url}}}) when is_binary(url), do: url
  def azure_prom_url(_), do: nil

  def resource_id(%{resource_id: r}) when is_binary(r), do: r
  def resource_id(_), do: ""

  def azure_opts(%{azure: %{} = az}), do: az
  def azure_opts(_), do: %{}

  @known_providers ~w(prometheus cloudwatch datadog elastic loki victoria_logs splunk tempo dynatrace newrelic)a

  def provider_hint(%Console.Schema.WorkbenchTool{tool: type}) when type in @known_providers,
    do: "This tool is configured against #{type}, and so you should be able to use its documented query format as needed."
  def provider_hint(_), do: ""
end
