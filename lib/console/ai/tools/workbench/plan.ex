defmodule Console.AI.Tools.Workbench.Plan do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJobResult

  embedded_schema do
    embeds_many :todos, WorkbenchJobResult.Todo, on_replace: :delete
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:todos, with: &WorkbenchJobResult.todo_changeset/2)
  end

  @json_schema Console.priv_file!("tools/workbench/plan.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "workbench_plan"
  def description(), do: "Plan the job you are tasked with."

  def implement(%__MODULE__{} = plan), do: {:ok, plan}
end
