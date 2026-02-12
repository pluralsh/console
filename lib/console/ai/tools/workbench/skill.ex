defmodule Console.AI.Tools.Workbench.Skill do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :skills, :map, virtual: true
    field :name, :string
  end

  @json_schema Console.priv_file!("tools/workbench/read_skill.json") |> Jason.decode!()

  def name(_), do: "workbench_skill"
  def json_schema(_), do: @json_schema
  def description(_), do: "Get a full description of a specific skill by name."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:name])
    |> validate_required([:name])
  end

  def implement(_, %__MODULE__{skills: %{} = skills}, %__MODULE__{name: name}) do
    case Map.get(skills, name) do
      %{contents: contents} -> {:ok, contents}
      _ -> {:error, "Skill #{name} not found"}
    end
  end
end
