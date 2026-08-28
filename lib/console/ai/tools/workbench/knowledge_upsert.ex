defmodule Console.AI.Tools.Workbench.KnowledgeUpsert do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJob
  alias Console.Deployments.Workbenches

  embedded_schema do
    field :job,         :map, virtual: true
    field :name,        :string
    field :description, :string
    field :knowledge,   :string
    field :labels,      {:array, :string}
  end

  @json_schema Console.priv_file!("tools/workbench/knowledge_upsert.json") |> Jason.decode!()

  def name(_), do: "workbench_knowledge_upsert"
  def json_schema(_), do: @json_schema
  def description(_), do: "Create or update a workbench knowledge entry by name. At most 10 knowledge entries can exist on a workbench; creating a new entry will fail if that limit is already reached. Prefer updating an existing entry when the information belongs with it."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:name, :description, :knowledge, :labels])
    |> validate_required([:name, :knowledge])
  end

  def implement(%__MODULE__{job: %WorkbenchJob{workbench_id: id}} = model) do
    attrs =
      %{
        name: model.name,
        description: model.description,
        knowledge: model.knowledge,
        labels: model.labels
      }
      |> Enum.reject(fn {_, v} -> is_nil(v) end)
      |> Map.new()

    with {:ok, knowledge} <- Workbenches.upsert_workbench_knowledge(attrs, id) do
      Map.take(knowledge, [:id, :name, :description, :knowledge, :labels, :usages, :last_used_at])
      |> Jason.encode()
    end
  end
end
