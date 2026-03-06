defmodule Console.AI.Tools.Workbench.Observability.MetricsSearch do
  use Console.AI.Tools.Workbench.Base
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{MetricsSearchInput, MetricsSearchOutput}
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool, :map, virtual: true
    field :query, :string
    field :limit, :integer
  end

  @valid ~w(query limit)a

  def json_schema(_), do: Console.priv_file!("tools/workbench/observability/metric_search.json") |> Jason.decode!()
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_metric_search_#{n}"
  def description(%__MODULE__{tool: %{name: n}}), do: "Search for metric names in the #{n} observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end


  def implement(_, %__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %MetricsSearchOutput{} = output} <- Stub.metrics_search(conn, input),
      do: Protobuf.JSON.encode(output)
  end

  defp input(%__MODULE__{tool: tool, query: q, limit: l}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %MetricsSearchInput{
        connection: connection,
        query: q,
        limit: l || 200
      }}
    end
  end
end
