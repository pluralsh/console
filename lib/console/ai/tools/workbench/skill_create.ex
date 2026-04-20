defmodule Console.AI.Tools.Workbench.SkillCreate do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchSkill

  embedded_schema do
    field :job, :map, virtual: true
    field :name, :string
    field :description, :string
    field :contents, :string
  end

  @json_schema Console.priv_file!("tools/workbench/skill_create.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_skill_create"
  def description(_), do: "Creates a new skill with the given name, description, and contents."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:name, :description, :contents])
    |> validate_required([:name, :description, :contents])
  end

  def implement(_, %__MODULE__{job: job} = model) do
    %WorkbenchSkill{workbench_id: job.workbench_id}
    |> WorkbenchSkill.changeset(%{name: model.name, description: model.description, contents: model.contents})
    |> Console.Repo.insert()
  end
end
