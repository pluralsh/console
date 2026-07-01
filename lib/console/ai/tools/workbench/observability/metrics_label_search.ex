defmodule Console.AI.Tools.Workbench.Observability.MetricsLabelSearch do
  use Console.AI.Tools.Workbench.Base
  import Console.AI.Tools.Workbench.Observability.Metrics, only: [azure_prom_url: 1, resource_id: 1, azure_opts: 1]
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{MetricsLabelSearchInput, MetricsLabelSearchOutput, MetricsLabelSearchOptions, AzureMetricsLabelSearchOptions}
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool, :map, virtual: true
    field :metric, :string
    field :query, :string
    field :label, :string
    field :limit, :integer

    embeds_one :options, Options, on_replace: :update, primary_key: false do
      embeds_one :azure, Azure, on_replace: :update, primary_key: false do
        field :resource_id, :string
        field :metrics_namespace, :string
        field :metrics_endpoint, :string
      end
    end
  end

  @valid ~w(metric query label limit)a
  @default_schema Console.priv_file!("tools/workbench/observability/metric_label_search.json") |> Jason.decode!()
  @azure_schema Console.priv_file!("tools/workbench/observability/metric_label_search_azure.json") |> Jason.decode!()

  def json_schema(%{tool: %{tool: :azure, configuration: %{azure: %{prometheus_url: url}}}}) when is_binary(url),
    do: @default_schema
  def json_schema(%{tool: %{tool: :azure}}), do: @azure_schema
  def json_schema(_), do: @default_schema

  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_metric_label_search_#{n}"

  def description(%__MODULE__{tool: %{name: n}}) do
    "Search metric label names or label values in the #{n} observability connection. Provide a metric and omit label to search label names, or provide label to search values for that label."
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:options)
    |> validate_required([:metric])
  end

  def implement(%__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %MetricsLabelSearchOutput{} = output} <- Stub.metrics_label_search(conn, input, Client.metrics_rpc_opts()),
      do: Protobuf.JSON.encode(output)
  end

  defp input(%__MODULE__{tool: tool, metric: m, query: q, label: label, limit: l, options: options}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %MetricsLabelSearchInput{
        connection: connection,
        metric: m,
        query: q,
        label: label,
        limit: l || 200,
        options: metrics_label_search_options(tool, options)
      }}
    end
  end

  defp metrics_label_search_options(%{tool: :azure} = tool, options) do
    query_azure = azure_opts(options)

    %MetricsLabelSearchOptions{azure: %AzureMetricsLabelSearchOptions{
      resource_id: resource_id(query_azure),
      metrics_namespace: Map.get(query_azure, :metrics_namespace),
      prometheus_url: azure_prom_url(tool),
      metrics_endpoint: Map.get(query_azure, :metrics_endpoint)
    }}
  end
  defp metrics_label_search_options(_, _), do: nil
end
