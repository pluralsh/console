defmodule Console.AI.Tools.Workbench.Observability.MetricsSearch do
  use Console.AI.Tools.Workbench.Base
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{MetricsSearchInput, MetricsSearchOutput, MetricsSearchOptions, AzureMetricsSearchOptions}
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool, :map, virtual: true
    field :query, :string
    field :limit, :integer

    embeds_one :options, Options, on_replace: :update, primary_key: false do
      embeds_one :azure, Azure, on_replace: :update, primary_key: false do
        field :resource_id, :string
      end
    end
  end

  @valid ~w(query limit)a
  @default_schema Console.priv_file!("tools/workbench/observability/metric_search.json") |> Jason.decode!()
  @azure_schema Console.priv_file!("tools/workbench/observability/metric_search_azure.json") |> Jason.decode!()

  def json_schema(%{tool: %{tool: :azure}}), do: @azure_schema
  def json_schema(_), do: @default_schema
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_metric_search_#{n}"
  def description(%__MODULE__{tool: %{name: n}}), do: "Search for metric names in the #{n} observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:options)
  end


  def implement(%__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %MetricsSearchOutput{} = output} <- Stub.metrics_search(conn, input),
      do: Protobuf.JSON.encode(output)
  end

  defp input(%__MODULE__{tool: tool, query: q, limit: l, options: options}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %MetricsSearchInput{
        connection: connection,
        query: q,
        limit: l || 200,
        options: metrics_search_options(tool, options)
      }}
    end
  end

  defp metrics_search_options(%{tool: :azure}, options) do
    query_azure = Map.get(options || %{}, :azure)
    resource_id = blank_to_nil(Map.get(query_azure || %{}, :resource_id))
    %MetricsSearchOptions{azure: %AzureMetricsSearchOptions{resource_id: resource_id || ""}}
  end
  defp metrics_search_options(_, _), do: nil

  defp blank_to_nil(v) do
    case String.trim(to_string(v || "")) do
      "" -> nil
      val -> val
    end
  end
end
