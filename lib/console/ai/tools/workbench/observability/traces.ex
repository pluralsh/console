defmodule Console.AI.Tools.Workbench.Observability.Traces do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.TimeRange
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{TracesQueryInput, TracesQueryOutput, TraceSpan}
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool, :map, virtual: true
    field :query,      :string
    field :limit,      :integer

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(query limit)a

  def json_schema(_), do: Console.priv_file!("tools/workbench/observability/traces.json") |> Jason.decode!()
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_traces_#{n}"
  def description(%__MODULE__{tool: %{name: n}}), do: "Gather traces from the #{n} observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:time_range)
    |> validate_required([:query])
  end

  def implement(_, %__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %TracesQueryOutput{} = output} <- Stub.traces(conn, input),
         {:ok, content} <- Protobuf.JSON.encode(output) do
      {:ok, %{content: content, traces: Enum.map(output.spans, &mapify/1)}}
    end
  end

  defp mapify(%TraceSpan{} = trace) do
    %{
      trace_id: trace.trace_id,
      span_id: trace.span_id,
      parent_id: trace.parent_id,
      name: trace.name,
      service: trace.service,
      start: TimeRange.to_datetime(trace.start),
      end: TimeRange.to_datetime(Map.get(trace, :end)),
      tags: trace.tags,
    }
  end

  defp input(%__MODULE__{tool: tool, query: q, limit: l, time_range: tr}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %TracesQueryInput{
        connection: connection,
        query: q,
        limit: l,
        range: TimeRange.to_proto(tr),
      }}
    end
  end
end
