defmodule Console.AI.Tools.Workbench.Complete do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchJobActivity, WorkbenchJobResult}
  alias Console.Schema.WorkbenchJobActivity.WorkbenchJobResult.{Metric, Log}

  embedded_schema do
    field :conclusion, :string
    embeds_many :todos, WorkbenchJobResult.Todo, on_replace: :delete
    embeds_many :metrics, Metric, on_replace: :delete
    embeds_many :logs, Log, on_replace: :delete
  end

  @json_schema Console.priv_file!("tools/workbench/complete.json") |> Jason.decode!()

  def name(), do: "workbench_complete"
  def json_schema(), do: @json_schema
  def description(), do: "Complete the workbench job, with the final conclusion given and any relevant metrics or logs to include in the result metadata.  Be sure to always mark the final status of all todos as well."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:conclusion])
    |> cast_embed(:metrics, with: &WorkbenchJobActivity.metric_changeset/2)
    |> cast_embed(:logs, with: &WorkbenchJobActivity.log_changeset/2)
    |> cast_embed(:todos, with: &WorkbenchJobResult.todo_changeset/2, required: true)
    |> validate_required([:conclusion])
  end

  def implement(result), do: {:ok, result}
end
