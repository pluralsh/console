defmodule Console.AI.Tools.Workbench.SkillIgnore do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "workbench_skill_ignore"
  def description(), do: "End the investigation entirely because no skill update is needed."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> validate_required([])
  end

  def implement(%__MODULE__{} = model), do: {:ok, model}
end
