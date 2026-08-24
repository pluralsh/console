defmodule Console.AI.Tools.Workbench.KnowledgeDelete do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJob
  alias Console.Deployments.Workbenches

  embedded_schema do
    field :job,          :map, virtual: true
    field :knowledge_id, :string
  end

  @json_schema Console.priv_file!("tools/workbench/knowledge_delete.json") |> Jason.decode!()

  def name(_), do: "workbench_knowledge_delete"
  def json_schema(_), do: @json_schema
  def description(_), do: "Delete a workbench knowledge entry by id. Prefer deleting less used entries (low usages and older last_used_at) when making room for new knowledge. Use workbench_list_knowledge to inspect usage data first."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:knowledge_id])
    |> validate_required([:knowledge_id])
  end

  def implement(%__MODULE__{job: %WorkbenchJob{} = job, knowledge_id: knowledge_id}) do
    with {:ok, knowledge} <- Workbenches.delete_workbench_knowledge(knowledge_id, job) do
      {:ok, "Deleted knowledge #{knowledge.name} (#{knowledge.id})"}
    end
  end
end
