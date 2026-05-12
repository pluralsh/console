defmodule Console.AI.Tools.Workbench.Observability.Plrl.MetricsSearch do
  use Console.AI.Tools.Workbench.Base
  import Console.AI.Tools.Workbench.Observability.Plrl.Metrics, only: [build_tool_connection: 0]
  alias Console.AI.Tools.Workbench.Observability.MetricsSearch

  embedded_schema do
    field :query, :string
    field :limit, :integer
  end

  @valid ~w(query limit)a

  def json_schema(), do: Console.priv_file!("tools/workbench/observability/metrics_search.json") |> Jason.decode!()
  def name(), do: "plrl_metrics_search"
  def description(), do: "Search for metric names in the (prometheus-compatible) Plural observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:query])
  end

  def implement(%__MODULE__{query: q, limit: l}) do
    with {:ok, conn} <- build_tool_connection() do
      tool = %MetricsSearch{tool: conn, query: q, limit: l}
      MetricsSearch.implement(tool)
    end
  end
end
