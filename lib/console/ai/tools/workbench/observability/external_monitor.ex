defmodule Console.AI.Tools.Workbench.Observability.ExternalMonitor do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Observability.External.Client

  embedded_schema do
    field :tool, :map, virtual: true
    field :monitor_id, :string
    field :scope, :string
  end

  @json_schema Console.priv_file!("tools/workbench/observability/external_monitor.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %{name: name}}),
    do: "workbench_observability_monitor_#{name}"

  def json_schema(_), do: @json_schema

  def description(%__MODULE__{tool: %{name: name}}),
    do: "Fetch one external monitor or alert rule from the #{name} observability connection, including its full provider definition, so it can be reinterpreted as a Plural monitor."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:monitor_id, :scope])
    |> validate_required([:monitor_id])
  end

  def implement(%__MODULE__{
        tool: tool,
        monitor_id: monitor_id,
        scope: scope
      }) do
    with {:ok, monitor} <- Client.get_monitor(tool, monitor_id, scope) do
      Jason.encode(monitor)
    end
  end
end
