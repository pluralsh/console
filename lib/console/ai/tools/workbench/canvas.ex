defmodule Console.AI.Tools.Workbench.Canvas do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :prompt, :string
  end

  @json_schema Console.priv_file!("tools/workbench/canvas.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "build_dashboard"
  def description(), do: "runs a subagent tobuild a dashboard to explain the system in question.  Be sure to provide a detailed prompt, including the exact metrics query json details from prior activities that will be needed in the dashboard."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:prompt])
    |> validate_required([:prompt])
  end

  def implement(result), do: {:ok, result}
end
