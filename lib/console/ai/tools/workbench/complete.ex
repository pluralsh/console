defmodule Console.AI.Tools.Workbench.Complete do
  use Console.AI.Tools.Workbench.Base
  alias Console.MermaidValidator
  alias Console.Schema.WorkbenchJobActivity
  alias Console.Schema.WorkbenchJobResult
  alias Console.Schema.WorkbenchJobResult.ToolQuery

  embedded_schema do
    field :conclusion, :string
    field :topology, :string
    embeds_many :todos, WorkbenchJobResult.Todo, on_replace: :delete
    embeds_one :metrics_query, ToolQuery, on_replace: :update
    embeds_many :logs, Console.Schema.WorkbenchJobActivity.WorkbenchJobResult.Log, on_replace: :delete
    embeds_one :traces_query, ToolQuery, on_replace: :update
    embeds_many :traces, Console.Schema.WorkbenchJobActivity.WorkbenchJobResult.Trace, on_replace: :delete
  end

  @json_schema Console.priv_file!("tools/workbench/complete.json") |> Jason.decode!()

  def name(), do: "workbench_complete"
  def json_schema(), do: @json_schema
  def description(), do: "Complete the workbench job, with the final conclusion given and any relevant metrics or logs to include in the result metadata.  Be sure to always mark the final status of all todos as well."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:conclusion, :topology])
    |> cast_embed(:logs, with: &WorkbenchJobActivity.log_changeset/2)
    |> cast_embed(:traces, with: &WorkbenchJobActivity.trace_changeset/2)
    |> cast_embed(:metrics_query)
    |> cast_embed(:traces_query)
    |> cast_embed(:todos, with: &WorkbenchJobResult.todo_changeset/2, required: true)
    |> validate_change(:topology, fn :topology, topology ->
      case MermaidValidator.validate(topology) do
        :ok -> []
        {:error, message} -> [topology: message]
      end
    end)
    |> validate_required([:conclusion])
  end

  def implement(result), do: {:ok, result}
end
