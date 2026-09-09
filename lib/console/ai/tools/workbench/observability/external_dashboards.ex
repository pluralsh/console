defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboards do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.Client

  @default_limit 25
  @max_limit 100

  embedded_schema do
    field :tool, :map, virtual: true
    field :q, :string
    field :limit, :integer, default: @default_limit
    field :scope, :string
    field :cursor, :string
  end

  @json_schema Console.priv_file!("tools/workbench/observability/external_dashboards.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %{name: name}}),
    do: "workbench_observability_dashboards_#{name}"

  def json_schema(_), do: @json_schema

  def description(%__MODULE__{tool: %{name: name}}),
    do: "Search external dashboards from the #{name} observability connection in pages of up to #{@max_limit} for inspection or reinterpretation as Plural dashboards."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:q, :limit, :scope, :cursor])
    |> validate_number(:limit, greater_than: 0, less_than_or_equal_to: @max_limit)
  end

  def implement(%__MODULE__{
        tool: tool,
        q: q,
        limit: limit,
        scope: scope,
        cursor: cursor
      }) do
    with {:ok, dashboards} <- Client.list(tool, q, limit, scope, cursor) do
      Jason.encode(dashboards)
    end
  end
end
