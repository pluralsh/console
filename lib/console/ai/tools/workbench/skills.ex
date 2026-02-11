defmodule Console.AI.Tools.Workbench.Skills do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :skills, :map, virtual: true
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def name(_), do: "workbench_skills"
  def json_schema(_), do: @json_schema
  def description(_), do: "Get the skills available to you."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
  end

  def implement(_, %__MODULE__{skills: skills}, _) do
    Enum.map(skills, fn {_, skill} -> Map.take(skill, [:name, :description]) end)
    |> Jason.encode()
  end
end
