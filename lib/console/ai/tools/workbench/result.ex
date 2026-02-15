defmodule Console.AI.Tools.Workbench.Result do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :output, :string
  end

  @json_schema Console.priv_file!("tools/workbench/subagent_result.json") |> Jason.decode!()

  def name(), do: "subagent_result"
  def json_schema(), do: @json_schema
  def description(), do: "Complete the subagent session for this workbench job"

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:output])
    |> validate_required([:output])
  end

  def implement(%__MODULE__{} = model), do: {:ok, model}
end
