defmodule Console.AI.Tools.Workbench.Observability.Traces do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.{TimeRange, TraceFilters}
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
  alias Console.AI.Tools.Workbench.Output

  embedded_schema do
    field :tool, :map, virtual: true
    field :query, :string
    field :limit, :integer

    embeds_one :filters, TraceFilters, on_replace: :update

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

  @valid ~w(query limit)a

  @default_schema Console.priv_file!("tools/workbench/observability/traces.json") |> Jason.decode!()
  @jaeger_schema Console.priv_file!("tools/workbench/observability/traces_jaeger.json") |> Jason.decode!()

  @truncation_hint "narrow the search with filters, a shorter time range or a lower limit"

  def json_schema(%{tool: %{tool: :jaeger}}), do: @jaeger_schema
  def json_schema(_), do: @default_schema
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_traces_#{n}"

  def description(%__MODULE__{tool: %{tool: t, name: n}}) do
    "Search traces in the #{n} observability connection. #{query_hint(t)} " <>
      "Prefer `filters` for service, span name, attribute, duration, error and trace id searches; " <>
      "discover valid services, span names and attribute values with workbench_observability_trace_facets_#{n} first. " <>
      "Returns a summary per trace (root span, duration, services, errors) with its spans."
  end

  defp query_hint(:tempo), do: "`query` is TraceQL, e.g. `{ resource.service.name = \"api\" && status = error }`, and is ANDed with filters."
  defp query_hint(:jaeger), do: "`query` is a service name; Jaeger searches require a service."
  defp query_hint(:datadog), do: "`query` is Datadog span search syntax, e.g. `service:api env:prod`, and matches individual spans; fetch a whole trace with filters.trace_id."
  defp query_hint(:dynatrace), do: "`query` is DQL starting with `fetch spans`; with filters, it is generated for you."
  defp query_hint(_), do: "`query` is the provider's native trace query."

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:time_range)
    |> TimeRange.put_default()
    |> cast_embed(:filters)
    |> cast_embed(:options, with: &options_changeset/2)
    |> validate_query_or_filters()
  end

  defp validate_query_or_filters(changeset) do
    case {get_field(changeset, :query), TraceFilters.present?(get_field(changeset, :filters))} do
      {q, false} when q in [nil, ""] -> add_error(changeset, :query, "provide a query or filters")
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

  def implement(%__MODULE__{} = tool) do
    tool = TimeRange.ensure(tool)

    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %TracesQueryOutput{} = output} <- Stub.traces(conn, input, Client.cloud_query_rpc_opts()),
         {:ok, content} <- Output.json(summarize(output.spans), @truncation_hint) do
      {:ok, %{content: content, traces: Enum.map(output.spans, &mapify/1)}}
    end
  end

  def structured(%__MODULE__{} = tool) do
    tool = TimeRange.ensure(tool)

    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
         {:ok, %TracesQueryOutput{} = output} <- Stub.traces(conn, input, Client.cloud_query_rpc_opts()) do
      {:ok, Enum.map(output.spans, &mapify/1)}
    end
  end

  @doc """
  Groups spans into traces, leading each with a summary so the model can pick
  interesting traces without reading every span.
  """
  def summarize(spans) do
    traces =
      spans
      |> Enum.group_by(& &1.trace_id)
      |> Enum.map(fn {trace_id, spans} -> Enum.sort_by(spans, &nanos(&1.start)) |> then(&{trace_id, &1}) end)
      |> Enum.sort_by(fn {_, [first | _]} -> nanos(first.start) end, :desc)
      |> Enum.map(fn {trace_id, spans} -> summarize_trace(trace_id, spans) end)

    %{trace_count: length(traces), span_count: length(spans), traces: traces}
  end

  defp summarize_trace(trace_id, spans) do
    ids = MapSet.new(spans, & &1.span_id)
    root = Enum.find(spans, &(&1.parent_id in [nil, ""] or not MapSet.member?(ids, &1.parent_id))) || hd(spans)
    starts = Enum.map(spans, &nanos(&1.start))
    ends = Enum.map(spans, &nanos(Map.get(&1, :end)))

    %{
      trace_id: trace_id,
      root: "#{root.service}: #{root.name}",
      start: TimeRange.to_datetime(root.start),
      duration_ms: duration_ms(Enum.min(starts), Enum.max(ends)),
      services: spans |> Enum.map(& &1.service) |> Enum.reject(&(&1 in [nil, ""])) |> Enum.uniq(),
      error_count: Enum.count(spans, &error?/1),
      spans: Enum.map(spans, &compact_span/1)
    }
  end

  defp compact_span(%TraceSpan{} = span) do
    %{
      span_id: span.span_id,
      parent_id: span.parent_id,
      service: span.service,
      name: span.name,
      duration_ms: duration_ms(nanos(span.start), nanos(Map.get(span, :end))),
      error: error?(span),
      tags: span.tags
    }
  end

  @error_tags ~w(otel.status_code status.code status_code status)

  defp error?(%TraceSpan{tags: tags}) when is_map(tags) do
    Map.get(tags, "error") in ["true", "1"] or
      Enum.any?(@error_tags, &(String.downcase(Map.get(tags, &1) || "") in ["error", "status_code_error", "2"]))
  end
  defp error?(_), do: false

  defp nanos(%Google.Protobuf.Timestamp{seconds: s, nanos: n}), do: s * 1_000_000_000 + n
  defp nanos(_), do: 0

  defp duration_ms(start, finish) when finish >= start and start > 0, do: Float.round((finish - start) / 1_000_000, 3)
  defp duration_ms(_, _), do: nil

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

  defp input(%__MODULE__{tool: tool, query: q, limit: l, time_range: tr, filters: filters, options: opts}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %TracesQueryInput{
        connection: connection,
        query: q || "",
        limit: l,
        range: TimeRange.to_proto(tr),
        filters: TraceFilters.to_proto(filters),
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
