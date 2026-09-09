defmodule Console.AI.Tools.Workbench.Monitoring.MonitorGet do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Monitoring

  embedded_schema do
    field :job, :map, virtual: true
    field :monitor_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/monitoring/monitor_id.json") |> Jason.decode!()

  def name(_), do: "workbench_monitor"
  def json_schema(_), do: @json_schema

  def description(_),
    do: "Show a monitor from this workbench, including its typed query, threshold, schedule, state, investigation prompt, and modes."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:monitor_id])
    |> validate_required([:monitor_id])
  end

  def implement(%__MODULE__{job: job, monitor_id: id}), do: Monitoring.get_monitor(job, id)
end
