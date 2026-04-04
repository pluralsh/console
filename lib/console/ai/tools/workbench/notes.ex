defmodule Console.AI.Tools.Workbench.Notes do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJobResult

  embedded_schema do
    embeds_one :status, Status, on_replace: :update do
      embeds_many :todos, WorkbenchJobResult.Todo, on_replace: :delete

      field :working_theory, :string
      field :topology, :string
    end
    field :summary, :string
  end

  @json_schema Console.priv_file!("tools/workbench/notes.json") |> Jason.decode!()

  def name(), do: "workbench_notes"
  def json_schema(), do: @json_schema
  def description(), do: "Record notes about the current task and plan.  Call this as work is completed throughout this job's duration."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:summary])
    |> cast_embed(:status, with: &status_changeset/2)
    |> validate_required([:summary, :status])
  end

  defp status_changeset(model, attrs) do
    model
    |> cast(attrs, [:working_theory, :topology])
    |> cast_embed(:todos, with: &WorkbenchJobResult.todo_changeset/2)
  end

  def implement(%__MODULE__{} = notes), do: {:ok, notes}
end
