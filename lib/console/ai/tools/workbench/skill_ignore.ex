defmodule Console.AI.Tools.Workbench.SkillIgnore do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do

  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_skill_ignore"
  def description(_), do: "End the investigation entirely because no skill update is needed."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> validate_required([])
  end

  def implement(_, %__MODULE__{} = model), do: {:ok, model}
end
