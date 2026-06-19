defmodule Console.AI.Tools.Workbench.Observability.MetricsSearch do
  use Console.AI.Tools.Workbench.Base
  import Console.AI.Tools.Workbench.Observability.Metrics, only: [azure_prom_url: 1, resource_id: 1, azure_opts: 1]
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

  def json_schema(%{tool: %{tool: :azure, configuration: %{azure: %{prometheus_url: url}}}}) when is_binary(url),
    do: @default_schema
  def json_schema(%{tool: %{tool: :azure}}), do: @azure_schema
  def json_schema(_), do: @default_schema

  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_metric_search_#{n}"

  def description(%__MODULE__{tool: %{name: n}}), do: "Search for metric names in the #{n} observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:options, with: &options_changeset/2)
  end

  defp options_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:azure, with: &azure_options_changeset/2)
  end

  defp azure_options_changeset(model, attrs) do
    cast(model, attrs, [:resource_id])
  end

  def implement(%__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %MetricsSearchOutput{} = output} <- Stub.metrics_search(conn, input, Client.metrics_rpc_opts()),
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

  defp metrics_search_options(%{tool: :azure} = tool, options) do
    query_azure = azure_opts(options)

    %MetricsSearchOptions{azure: %AzureMetricsSearchOptions{
      resource_id: resource_id(query_azure),
      prometheus_url: azure_prom_url(tool)
    }}
  end
  defp metrics_search_options(_, _), do: nil
end
