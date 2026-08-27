defmodule Console.AI.Tools.Workbench.Knowledge do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJob
  alias Console.Deployments.Workbenches

  embedded_schema do
    field :job,  :map, virtual: true
    field :name, :string
  end

  @json_schema Console.priv_file!("tools/workbench/read_knowledge.json") |> Jason.decode!()

  def name(_), do: "workbench_knowledge"
  def json_schema(_), do: @json_schema
  def description(_), do: "Get the full contents of a specific workbench knowledge entry by name. Use the workbench_list_knowledge tool to list entries first. Reading an entry records a usage."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:name])
    |> validate_required([:name])
  end

  def implement(%__MODULE__{job: %WorkbenchJob{workbench_id: id}, name: name}) do
    with {:ok, knowledge} <- Workbenches.knowledge_used(id, name) do
      Map.take(knowledge, [:id, :name, :description, :knowledge, :labels, :usages, :last_used_at])
      |> Jason.encode()
    end
  end
end
