defmodule Console.AI.Tools.Workbench.Monitoring.DashboardDelete do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Monitoring

  embedded_schema do
    field :job, :map, virtual: true
    field :user, :map, virtual: true
    field :dashboard_name, :string
  end

  @json_schema Console.priv_file!("tools/workbench/monitoring/dashboard_delete.json")
               |> Jason.decode!()

  def name(_), do: "workbench_dashboard_delete"
  def json_schema(_), do: @json_schema
  def description(_), do: "Permanently delete a named dashboard belonging to this workbench."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:dashboard_name])
    |> validate_required([:dashboard_name])
  end

  def implement(%__MODULE__{job: job, user: user, dashboard_name: name}),
    do: Monitoring.delete_dashboard(job, user, name)
end
