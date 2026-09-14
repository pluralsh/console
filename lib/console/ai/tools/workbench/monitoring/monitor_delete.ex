defmodule Console.AI.Tools.Workbench.Monitoring.MonitorDelete do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Monitoring

  embedded_schema do
    field :job, :map, virtual: true
    field :user, :map, virtual: true
    field :monitor_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/monitoring/monitor_id.json") |> Jason.decode!()

  def name(_), do: "workbench_monitor_delete"
  def json_schema(_), do: @json_schema
  def description(_), do: "Delete a monitor belonging to this workbench."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:monitor_id])
    |> validate_required([:monitor_id])
  end

  def implement(%__MODULE__{job: job, user: user, monitor_id: id}),
    do: Monitoring.delete_monitor(job, user, id)
end
