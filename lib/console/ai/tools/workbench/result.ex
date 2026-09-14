defmodule Console.AI.Tools.Workbench.Result do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :output, :string
  end

  @json_schema Console.priv_file!("tools/workbench/subagent_result.json") |> Jason.decode!()

  def name(), do: "subagent_result"
  def json_schema(), do: @json_schema
  def description() do
    "Complete the subagent session for this workbench job. The output's first line must specifically describe the work completed or the outcome reached, without a generic heading such as \"Conclusion\" or \"Result\". The remaining output should thoroughly summarize the work done in response to the original prompt so any future agent can understand it without reviewing this session."
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:output])
    |> validate_required([:output])
  end

  def implement(%__MODULE__{} = model), do: {:ok, model}
end
