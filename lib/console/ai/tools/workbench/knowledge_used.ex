defmodule Console.AI.Tools.Workbench.KnowledgeUsed do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJob
  alias Console.Deployments.Workbenches

  embedded_schema do
    field :job,  :map, virtual: true
    field :name, :string
  end

  @json_schema Console.priv_file!("tools/workbench/knowledge_used.json") |> Jason.decode!()

  def name(_), do: "workbench_knowledge_used"
  def json_schema(_), do: @json_schema
  def description(_), do: "Record that a knowledge entry was used for this workbench job. Call this when you apply existing knowledge, including if you already have its contents. Use workbench_list_knowledge to find names. Reading via workbench_knowledge also records usage."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:name])
    |> validate_required([:name])
  end

  def implement(%__MODULE__{job: %WorkbenchJob{workbench_id: id}, name: name}) do
    with {:ok, knowledge} <- Workbenches.knowledge_used(id, name) do
      Map.take(knowledge, [:id, :name, :usages, :last_used_at])
      |> Jason.encode()
    end
  end
end
