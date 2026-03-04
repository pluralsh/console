defmodule Console.AI.Tools.Workbench.Observability.MetricsSearch do
  use Console.AI.Tools.Workbench.Base
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{MetricsSearchInput, MetricsSearchResult}
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool, :map, virtual: true
    field :query, :string
  end

  @valid ~w(query)a

  def json_schema(_), do: Console.priv_file!("tools/workbench/observability/metric_search.json") |> Jason.decode!()
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_metric_search_#{n}"
  def description(%__MODULE__{tool: %{name: n}}), do: "Gather metrics from the #{n} observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:query])
  end


  def implement(_, %__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %MetricsSearchResult{} = output} <- Stub.metrics_search(conn, input),
      do: Protobuf.JSON.encode(output)
  end

  defp input(%__MODULE__{tool: tool, query: q}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %MetricsSearchInput{
        connection: connection,
        query: q,
        limit: 30
      }}
    end
  end
end
