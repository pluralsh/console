defmodule Console.AI.Tools.Workbench.SkillBackfill do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :prompt, :string
  end

  @json_schema Console.priv_file!("tools/workbench/skill_backfill.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "workbench_skill_backfill"
  def description(), do: "Backfills the missing skills based on the result of the job."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:prompt])
    |> validate_required([:prompt])
  end

  def implement(%__MODULE__{} = model), do: {:ok, model}
end
