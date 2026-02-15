defmodule Console.AI.Tools.Workbench.Notes do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.AgentRun

  embedded_schema do
    embeds_one :status, Status, on_replace: :update do
      field :todos, {:array, :map}
      field :working_theory, :string
    end
    field :prompt, :string
    field :output, :string
  end

  @json_schema Console.priv_file!("tools/workbench/notes.json") |> Jason.decode!()

  def name(), do: "workbench_notes"
  def json_schema(), do: @json_schema
  def description(), do: "Record notes about the current task and plan."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:prompt, :output])
    |> cast_embed(:status, with: &status_changeset/2)
    |> validate_required([:prompt, :output, :status])
  end

  defp status_changeset(model, attrs) do
    model
    |> cast(attrs, [:working_theory])
    |> cast_embed(:todos, with: &AgentRun.todo_changeset/2)
  end

  def implement(%__MODULE__{} = notes), do: {:ok, notes}
end
