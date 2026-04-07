defmodule Console.AI.Tools.Workbench.Observability.Metrics do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.TimeRange
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{MetricsQueryInput, MetricsQueryOutput}
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool, :map, virtual: true
    field :query, :string
    field :step,  :string

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(query step)a

  def json_schema(_), do: Console.priv_file!("tools/workbench/observability/metrics.json") |> Jason.decode!()
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_metrics_#{n}"
  def description(%__MODULE__{tool: %{name: n} = t}), do: String.trim("Gather metrics from the #{n} observability connection. #{provider_hint(t)}")

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:time_range)
    |> validate_required([:query])
  end


  def implement(_, %__MODULE__{} = tool) do
    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(Map.put_new(tool, :time_range, TimeRange.default())),
         {:ok, %MetricsQueryOutput{} = output} <- Stub.metrics(conn, input),
      do: Protobuf.JSON.encode(output)
  end

  defp input(%__MODULE__{tool: tool, query: q, step: s, time_range: tr}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %MetricsQueryInput{
        connection: connection,
        query: q,
        step: s,
        range: TimeRange.to_proto(tr),
      }}
    end
  end


  @known_providers ~w(prometheus datadog elastic loki splunk tempo dynatrace newrelic)a

  def provider_hint(%Console.Schema.WorkbenchTool{tool: type}) when type in @known_providers,
    do: "This tool is configured against #{type}, and so you should be able to use its documented query format as needed."
  def provider_hint(_), do: ""
end
