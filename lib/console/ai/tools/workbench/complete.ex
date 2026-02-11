defmodule Console.AI.Tools.Workbench.Complete do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :conclusion, :string
  end

  @json_schema Console.priv_file!("tools/workbench/complete.json") |> Jason.decode!()

  def name(), do: "workbench_complete"
  def json_schema(), do: @json_schema
  def description(), do: "Complete the workbench job, with the final conclusion given"

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:conclusion])
    |> validate_required([:conclusion])
  end

  def implement(result), do: {:ok, result}
end
