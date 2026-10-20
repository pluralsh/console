defmodule Console.AI.Tools.Workbench.Observability.TraceFacets do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.{TimeRange, TraceFilters}
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.{Stub}
  alias Toolquery.{TraceFacetsInput, TraceFacetsOutput}
  alias Console.AI.Workbench.Conversion
  alias Console.AI.Tools.Workbench.Output

  embedded_schema do
    field :tool, :map, virtual: true
    field :attribute, :string
    field :query, :string
    field :limit, :integer

    embeds_one :filters, TraceFilters, on_replace: :update
    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(attribute query limit)a
  @schema Console.priv_file!("tools/workbench/observability/trace_facets.json") |> Jason.decode!()

  def json_schema(_), do: @schema
  def name(%__MODULE__{tool: %{name: n}}), do: "workbench_observability_trace_facets_#{n}"

  def description(%__MODULE__{tool: %{tool: t, name: n}}) do
    "Discover what to search for in the #{n} trace connection. Omit attribute to list searchable attribute names; " <>
      "set attribute to `service.name`, `name` (span name) or any attribute name to list its values, most common first. " <>
      "Scope values with filters, e.g. span names for one service. #{provider_hint(t)}" <>
      "Feed the results into workbench_observability_traces_#{n} filters."
  end

  defp provider_hint(:jaeger), do: "Jaeger only lists `service.name`, and `name` once filters.service is set. "
  defp provider_hint(t) when t in [:datadog, :dynatrace], do: "Attribute names are sampled from recent spans and values carry span counts. "
  defp provider_hint(_), do: ""

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:filters)
    |> cast_embed(:time_range)
    |> TimeRange.put_default()
  end

  def implement(%__MODULE__{} = tool) do
    with {:ok, %TraceFacetsOutput{values: values}} <- facets(tool) do
      Output.json(Enum.map(values, &value/1), "narrow it with query or filters")
    end
  end

  def structured(%__MODULE__{} = tool) do
    with {:ok, %TraceFacetsOutput{values: values}} <- facets(tool),
      do: {:ok, Enum.map(values, & &1.name)}
  end

  defp facets(tool) do
    tool = TimeRange.ensure(tool)

    with {:ok, conn} <- Client.connect(),
         {:ok, input} <- input(tool),
      do: Stub.trace_facets(conn, input, Client.cloud_query_rpc_opts())
  end

  defp value(%{name: n, count: nil}), do: %{name: n}
  defp value(%{name: n, count: c}), do: %{name: n, count: c}

  defp input(%__MODULE__{tool: tool, attribute: attr, query: q, limit: l, filters: filters, time_range: tr}) do
    with {:ok, connection} <- Conversion.to_proto(tool) do
      {:ok, %TraceFacetsInput{
        connection: connection,
        attribute: attr,
        query: q,
        limit: l,
        filters: TraceFilters.to_proto(filters),
        range: TimeRange.to_proto(tr)
      }}
    end
  end
end
