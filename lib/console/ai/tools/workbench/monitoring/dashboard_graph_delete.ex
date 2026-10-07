defmodule Console.AI.Tools.Workbench.Monitoring.DashboardGraphDelete do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Monitoring

  embedded_schema do
    field :job, :map, virtual: true
    field :user, :map, virtual: true
    field :dashboard_name, :string
    field :graph_identifier, :string
  end

  @json_schema Console.priv_file!("tools/workbench/monitoring/dashboard_graph_delete.json")
               |> Jason.decode!()

  def name(_), do: "workbench_dashboard_graph_delete"
  def json_schema(_), do: @json_schema

  def description(_),
    do: "Delete one graph, identified by its unique identifier, from a named workbench dashboard."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:dashboard_name, :graph_identifier])
    |> validate_required([:dashboard_name, :graph_identifier])
  end

  def implement(%__MODULE__{
        job: job,
        user: user,
        dashboard_name: name,
        graph_identifier: identifier
      }),
      do: Monitoring.delete_dashboard_graph(job, user, name, identifier)
end
