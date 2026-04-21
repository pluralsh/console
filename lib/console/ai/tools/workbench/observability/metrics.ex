defmodule Console.AI.Tools.Workbench.Observability.Metrics do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.TimeRange
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{MetricsQueryInput, MetricsQueryOutput, MetricsOptions, AzureMetricsOptions, MetricPoint}
  alias Console.AI.Workbench.Conversion

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

  def json_schema(%{tool: %{tool: :azure}}), do: @azure_schema
  def json_schema(_), do: @default_schema
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_metrics_#{n}"
  def description(%__MODULE__{tool: %{name: n} = t}), do: String.trim("Gather metrics from the #{n} observability connection. #{provider_hint(t)}")

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:options)
    |> cast_embed(:time_range)
    |> validate_required([:query])
  end

  def implement(%__MODULE__{} = tool) do
    tool = Map.put_new(tool, :time_range, TimeRange.default())
    with :ok <- TimeRange.safe(tool.time_range),
         {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %MetricsQueryOutput{} = output} <- Stub.metrics(conn, input),
         {:ok, content} <- Protobuf.JSON.encode(output) do
      {:ok, %{content: content, metrics: Enum.map(output.metrics, &mapify/1)}}
    end
  end

  def structured(%__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(Map.put_new(tool, :time_range, TimeRange.default())),
         {:ok, %MetricsQueryOutput{} = output} <- Stub.metrics(conn, input) do
      {:ok, Enum.map(output.metrics, &mapify/1)}
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
      tr = TimeRange.to_proto(tr)
      {:ok, %MetricsQueryInput{connection: connection, query: q, step: s,  range: tr, options: metrics_options(tool, options)}}
    end
  end

  defp metrics_options(%{tool: :azure}, options) do
    query_azure = Map.get(options || %{}, :azure)
    resource_id = blank_to_nil(Map.get(query_azure || %{}, :resource_id))

    %MetricsOptions{azure: %AzureMetricsOptions{
      resource_id: resource_id || "",
      metrics_namespace: Map.get(query_azure || %{}, :metrics_namespace) || "",
      aggregation: Map.get(query_azure || %{}, :aggregation),
      filter: Map.get(query_azure || %{}, :filter),
      order_by: Map.get(query_azure || %{}, :order_by),
      roll_up_by: Map.get(query_azure || %{}, :roll_up_by),
      metrics_endpoint: Map.get(query_azure || %{}, :metrics_endpoint),
    }}
  end
  defp metrics_options(_, _), do: nil

  defp blank_to_nil(v) do
    case String.trim(to_string(v || "")) do
      "" -> nil
      val -> val
    end
  end


  @known_providers ~w(prometheus datadog elastic loki splunk tempo dynatrace newrelic)a

  def provider_hint(%Console.Schema.WorkbenchTool{tool: type}) when type in @known_providers,
    do: "This tool is configured against #{type}, and so you should be able to use its documented query format as needed."
  def provider_hint(_), do: ""
end
