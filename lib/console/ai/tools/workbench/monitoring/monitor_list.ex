defmodule Console.AI.Tools.Workbench.Monitoring.MonitorList do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Monitoring

  @default_limit 25
  @max_limit 100

  embedded_schema do
    field :job, :map, virtual: true
    field :q, :string
    field :limit, :integer, default: @default_limit
    field :offset, :integer, default: 0
  end

  @json_schema Console.priv_file!("tools/workbench/monitoring/list.json") |> Jason.decode!()

  def name(_), do: "workbench_monitors"
  def json_schema(_), do: @json_schema

  def description(_),
    do: "Search monitors belonging to this workbench in pages of up to #{@max_limit}. Use workbench_monitor with an id to inspect its query, threshold, schedule, and current state."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:q, :limit, :offset])
    |> validate_number(:limit, greater_than: 0, less_than_or_equal_to: @max_limit)
    |> validate_number(:offset, greater_than_or_equal_to: 0)
  end

  def implement(%__MODULE__{job: job, q: q, limit: limit, offset: offset}),
    do: Monitoring.list_monitors(job, q, limit, offset)
end
