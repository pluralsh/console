defmodule Console.AI.Tools.Workbench.Observability.Logs do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.{TimeRange, Metrics}
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{LogsQueryInput, LogsQueryOutput, LogsQueryFacet, LogEntry}
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool,  :map, virtual: true
    field :query, :string
    field :limit, :integer

    embeds_many :facets, Facet, on_replace: :delete, primary_key: false do
      field :name,  :string
      field :value, :string
    end

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(query limit)a

  def json_schema(_), do: Console.priv_file!("tools/workbench/observability/logs.json") |> Jason.decode!()
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_logs_#{n}"
  def description(%__MODULE__{tool: %{name: n} = t}), do: String.trim("Gather logs from the #{n} observability connection. #{Metrics.provider_hint(t)}")

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
         {:ok, content} <- Protobuf.JSON.encode(output) do
      {:ok, %{content: content, logs: Enum.map(output.logs, &to_log/1)}}
    end
  end

  defp to_log(%LogEntry{} = log) do
    %{
      timestamp: TimeRange.to_datetime(log.timestamp),
      message: log.message,
      labels: log.labels,
    }
  end

  defp input(%__MODULE__{tool: tool, query: q, limit: l, time_range: tr, facets: fs}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %LogsQueryInput{
        connection: connection,
        query: q,
        limit: l,
        facets: to_facets(fs),
        range: TimeRange.to_proto(tr),
      }}
    end
  end

  defp to_facets([_ | _] = facets), do: Enum.map(facets, & %LogsQueryFacet{name: &1.name, value: &1.value})
  defp to_facets(_), do: nil
end
