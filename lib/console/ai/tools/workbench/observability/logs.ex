defmodule Console.AI.Tools.Workbench.Observability.Logs do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.TimeRange
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{LogsQueryInput, LogsQueryOutput, LogsQueryFacet, LogsOptions, AzureLogsOptions}
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool,   :map, virtual: true
    field :query,  :string
    field :limit,  :integer

    embeds_many :facets, Facet, on_replace: :delete, primary_key: false do
      field :name,  :string
      field :value, :string
    end

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(query limit)a

  def json_schema(_), do: Console.priv_file!("tools/workbench/observability/logs.json") |> Jason.decode!()
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_logs_#{n}"
  def description(%__MODULE__{tool: %{name: n}}), do: "Gather logs from the #{n} observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:time_range)
    |> cast_embed(:facets, with: &facet_changeset/2)
    |> validate_required([:query])
  end

  defp facet_changeset(model, attrs) do
    model
    |> cast(attrs, [:name, :value])
    |> validate_required([:name, :value])
  end

  def implement(_, %__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(Map.put_new(tool, :time_range, TimeRange.default())),
         {:ok, %LogsQueryOutput{} = output} <- Stub.logs(conn, input),
      do: Protobuf.JSON.encode(output)
  end

  defp input(%__MODULE__{tool: tool, query: q, limit: l, time_range: tr, facets: fs}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %LogsQueryInput{
        connection: connection,
        query: q,
        limit: l,
        facets: to_facets(fs),
        range: TimeRange.to_proto(tr),
        options: logs_options(tool),
      }}
    end
  end

  defp to_facets([_ | _] = facets), do: Enum.map(facets, & %LogsQueryFacet{name: &1.name, value: &1.value})
  defp to_facets(_), do: nil

  defp logs_options(%{tool: :azure, configuration: %{azure: %{resource_id: resource_id}}})
       when is_binary(resource_id) and resource_id != "" do
    %LogsOptions{azure: %AzureLogsOptions{resource_id: resource_id}}
  end
  defp logs_options(_), do: nil
end
