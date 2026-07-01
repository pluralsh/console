defmodule Console.AI.Tools.Workbench.Observability.Plrl.MetricsLabelSearch do
  use Console.AI.Tools.Workbench.Base
  import Console.AI.Tools.Workbench.Observability.Plrl.Metrics, only: [build_tool_connection: 0]
  alias Console.AI.Tools.Workbench.Observability.MetricsLabelSearch

  embedded_schema do
    field :metric, :string
    field :query, :string
    field :label, :string
    field :limit, :integer
  end

  @valid ~w(metric query label limit)a

  @json_schema Console.priv_file!("tools/workbench/observability/metric_label_search.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "plrl_metric_label_search"
  def description(), do: "Search metric label names or label values in the Plural observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:metric])
  end

  def implement(%__MODULE__{metric: m, query: q, label: label, limit: l}) do
    with {:ok, conn} <- build_tool_connection() do
      tool = %MetricsLabelSearch{tool: conn, metric: m, query: q, label: label, limit: l}
      MetricsLabelSearch.implement(tool)
    end
  end
end
