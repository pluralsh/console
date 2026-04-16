defmodule Console.AI.Tools.Workbench.Observability.Traces do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.TimeRange
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{
    TracesQueryInput,
    TracesQueryOutput,
    TraceSpan,
    TracesOptions,
    JaegerTracesOptions,
    JaegerTraceQueryAttribute
  }
  alias Console.AI.Workbench.Conversion

  embedded_schema do
    field :tool, :map, virtual: true
    field :service_name, :string
    field :query,      :string
    field :limit,      :integer

    embeds_one :options, Options, on_replace: :update, primary_key: false do
      embeds_one :jaeger, Jaeger, on_replace: :update, primary_key: false do
        field :operation_name, :string
        field :duration_min,   :string
        field :duration_max,   :string

        embeds_many :attributes, Attribute, on_replace: :delete, primary_key: false do
          field :name,  :string
          field :value, :string
        end
      end
    end

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(service_name query limit)a

  @default_schema Console.priv_file!("tools/workbench/observability/traces.json") |> Jason.decode!()
  @jaeger_schema Console.priv_file!("tools/workbench/observability/traces_jaeger.json") |> Jason.decode!()

  def json_schema(%{tool: %{tool: :jaeger}}), do: @jaeger_schema
  def json_schema(_), do: @default_schema
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_traces_#{n}"
  def description(%__MODULE__{tool: %{name: n}}), do: "Gather traces from the #{n} observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:time_range)
    |> cast_embed(:options, with: &options_changeset/2)
    |> set_query_from_service_name()
    |> validate_required([:query])
  end

  defp set_query_from_service_name(changeset) do
    case {get_field(changeset, :query), get_field(changeset, :service_name)} do
      {nil, service} when is_binary(service) and service != "" -> put_change(changeset, :query, String.trim(service))
      {"", service} when is_binary(service) and service != "" -> put_change(changeset, :query, String.trim(service))
      _ -> changeset
    end
  end

  defp options_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:jaeger, with: &jaeger_options_changeset/2)
  end

  defp jaeger_options_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(operation_name duration_min duration_max)a)
    |> cast_embed(:attributes, with: &attribute_changeset/2)
  end

  defp attribute_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name value)a)
    |> validate_required([:name, :value])
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

  defp input(%__MODULE__{tool: tool, query: q, limit: l, time_range: tr, options: opts}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %TracesQueryInput{
        connection: connection,
        query: q,
        limit: l,
        range: TimeRange.to_proto(tr),
        options: to_options(tool, opts),
      }}
    end
  end

  defp to_options(%{tool: :jaeger}, opts) do
    query_jaeger = Map.get(opts || %{}, :jaeger)
    %TracesOptions{
      jaeger: %JaegerTracesOptions{
        operation_name: query_jaeger && query_jaeger.operation_name,
        duration_min: query_jaeger && query_jaeger.duration_min,
        duration_max: query_jaeger && query_jaeger.duration_max,
        attributes: to_attributes(query_jaeger && query_jaeger.attributes),
      }
    }
  end

  defp to_options(_, _), do: nil

  defp to_attributes([_ | _] = attributes) do
    Enum.map(attributes, fn %{name: n, value: v} -> %JaegerTraceQueryAttribute{name: n, value: v} end)
  end

  defp to_attributes(_), do: []
end
