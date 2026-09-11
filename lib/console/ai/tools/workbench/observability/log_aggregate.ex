defmodule Console.AI.Tools.Workbench.Observability.LogAggregate do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.{TimeRange, Metrics}
  alias Console.AI.Tools.Workbench.Output
  alias Console.AI.Workbench.Conversion
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{
    AzureLogsOptions,
    LogAggregateBucket,
    LogAggregateInput,
    LogAggregateOutput,
    LogsOptions,
    LogsQueryFacet
  }

  embedded_schema do
    field :tool, :map, virtual: true
    field :query, :string
    field :bucket_size, :string
    field :operator, Console.Schema.Monitor.Operator, default: :or

    embeds_one :options, Options, on_replace: :update, primary_key: false do
      embeds_one :azure, Azure, on_replace: :update, primary_key: false do
        field :resource_id, :string
      end
    end

    embeds_many :facets, Facet, on_replace: :delete, primary_key: false do
      field :name, :string
      field :value, :string
    end

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(query bucket_size operator)a
  @default_schema Console.priv_file!("tools/workbench/observability/log_aggregate.json") |> Jason.decode!()
  @azure_schema Console.priv_file!("tools/workbench/observability/log_aggregate_azure.json") |> Jason.decode!()

  def json_schema(%{tool: %{tool: :azure}}), do: @azure_schema
  def json_schema(_), do: @default_schema
  def name(%__MODULE__{tool: %{name: name}}), do: "workbench_observability_log_aggregate_#{name}"

  def description(%__MODULE__{tool: %{name: name} = tool}),
    do: String.trim("Aggregate log counts from the #{name} observability connection. Leave the query empty to aggregate logs without a text filter. #{Metrics.provider_hint(tool)}#{query_hint(tool)}#{facet_hint(tool)}")

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:options, with: &options_changeset/2)
    |> cast_embed(:time_range)
    |> cast_embed(:facets, with: &facet_changeset/2)
    |> validate_required([:bucket_size])
  end

  def implement(%__MODULE__{} = tool) do
    with {:ok, buckets} <- structured(tool),
         {:ok, content} <- Jason.encode(buckets) do
      {:ok, Output.truncate(content)}
    end
  end

  def structured(%__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(Map.put_new(tool, :time_range, TimeRange.default())),
         {:ok, %LogAggregateOutput{} = output} <-
           Stub.log_aggregate(conn, input, Client.logs_rpc_opts()) do
      {:ok, Enum.map(output.buckets, &to_bucket/1)}
    end
  end

  defp input(
    %__MODULE__{
      tool: tool,
      query: query,
      bucket_size: bucket_size,
      operator: operator,
      time_range: time_range,
      facets: facets,
      options: options
    }
  ) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok,
       %LogAggregateInput{
         connection: connection,
         query: query || "",
         range: TimeRange.to_proto(time_range),
         bucket_size: bucket_size,
         facets: to_facets(facets),
         options: logs_options(tool, options),
         operator: log_operator(operator)
       }}
    end
  end

  defp to_bucket(%LogAggregateBucket{} = bucket),
    do: %{timestamp: TimeRange.to_datetime(bucket.timestamp), count: bucket.count}

  defp options_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:azure, with: &azure_options_changeset/2)
  end

  defp azure_options_changeset(model, attrs), do: cast(model, attrs, [:resource_id])

  defp facet_changeset(model, attrs) do
    model
    |> cast(attrs, [:name, :value])
    |> validate_required([:name, :value])
  end

  defp log_operator(:or), do: :LOG_QUERY_OPERATOR_OR
  defp log_operator(_), do: :LOG_QUERY_OPERATOR_AND

  defp to_facets([_ | _] = facets),
    do: Enum.map(facets, &%LogsQueryFacet{name: &1.name, value: &1.value})

  defp to_facets(_), do: nil

  defp logs_options(%{tool: :azure}, options) do
    query_azure = Map.get(options || %{}, :azure)
    resource_id = blank_to_nil(Map.get(query_azure || %{}, :resource_id))
    %LogsOptions{azure: %AzureLogsOptions{resource_id: resource_id || ""}}
  end

  defp logs_options(_, _), do: nil

  defp query_hint(%{tool: :elastic}), do: " Elasticsearch analyzes the query against the \"message\" field only. Terms use the selected operator, which defaults to OR. Use an empty query or \"*\" to match all log messages."
  defp query_hint(%{tool: :loki}), do: " An empty query uses the supplied facets as the LogQL stream selector. Without facets, it defaults to `{job=~\".+\"}`, so only streams with a nonempty `job` label are returned."
  defp query_hint(_), do: ""

  defp facet_hint(%{tool: :elastic}), do: " Facets are exact-match term filters and are combined with AND. Use the mapped field name, typically a keyword field such as \"cluster.name.keyword\" or \"kubernetes.namespace.keyword\"."
  defp facet_hint(_), do: ""

  defp blank_to_nil(value) do
    case String.trim(to_string(value || "")) do
      "" -> nil
      value -> value
    end
  end
end
