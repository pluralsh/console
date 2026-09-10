defmodule Console.AI.Tools.Workbench.Monitoring.DashboardDelete do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Monitoring

  embedded_schema do
    field :job, :map, virtual: true
    field :user, :map, virtual: true
    field :dashboard_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/monitoring/dashboard_id.json") |> Jason.decode!()

  def name(_), do: "workbench_dashboard_delete"
  def json_schema(_), do: @json_schema
  def description(_), do: "Delete a dashboard belonging to this workbench."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:dashboard_id])
    |> validate_required([:dashboard_id])
  end

  def implement(%__MODULE__{job: job, user: user, dashboard_id: id}),
    do: Monitoring.delete_dashboard(job, user, id)
end
