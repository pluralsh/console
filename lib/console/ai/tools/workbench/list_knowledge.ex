defmodule Console.AI.Tools.Workbench.ListKnowledge do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJob
  alias Console.Deployments.Workbenches

  embedded_schema do
    field :job, :map, virtual: true
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def name(_), do: "workbench_list_knowledge"
  def json_schema(_), do: @json_schema
  def description(_), do: "Get the knowledge entries available on this workbench. This only lists names, descriptions, labels, and usage data (usages, last_used_at); call the workbench_knowledge tool to get the full contents of a specific entry."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
  end

  def implement(%__MODULE__{job: %WorkbenchJob{workbench_id: id}}) do
    Workbenches.list_workbench_knowledge(id)
    |> Enum.map(&Map.take(&1, [:id, :name, :description, :labels, :usages, :last_used_at]))
    |> Jason.encode()
  end
end
