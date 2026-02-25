defmodule Console.AI.Tools.Workbench.Observability.Logs do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.TimeRange
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{LogsQueryInput, LogsQueryOutput}
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool, :map, virtual: true
    field :query, :string
    field :limit,  :integer

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
    |> validate_required([:query])
  end

  def implement(_, %__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %LogsQueryOutput{} = output} <- Stub.logs(conn, input),
      do: Protobuf.JSON.encode(output)
  end

  defp input(%__MODULE__{tool: tool, query: q, limit: l, time_range: tr}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %LogsQueryInput{
        connection: connection,
        query: q,
        limit: l,
        range: TimeRange.to_proto(tr),
      }}
    end
  end
end
