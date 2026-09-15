defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboard do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.External.Client

  embedded_schema do
    field :tool, :map, virtual: true
    field :dashboard_id, :string
    field :scope, :string
  end

  @json_schema Console.priv_file!("tools/workbench/observability/external_dashboard.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %{name: name}}),
    do: "workbench_observability_dashboard_#{name}"

  def json_schema(_), do: @json_schema

  def description(%__MODULE__{tool: %{name: name}}),
    do: "Fetch one external dashboard from the #{name} observability connection, including its full provider definition, so it can be reinterpreted as a Plural dashboard."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:dashboard_id, :scope])
    |> validate_required([:dashboard_id])
  end

  def implement(%__MODULE__{
        tool: tool,
        dashboard_id: dashboard_id,
        scope: scope
      }) do
    with {:ok, dashboard} <- Client.get_dashboard(tool, dashboard_id, scope) do
      Jason.encode(dashboard)
    end
  end
end
