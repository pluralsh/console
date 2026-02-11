defmodule Console.Schema.WorkbenchJobResult do
  use Console.Schema.Base
  alias Console.Schema.{WorkbenchJob, AgentRun}

  defenum TodoStatus, pending: 0, in_progress: 1, completed: 2

  schema "workbench_job_results" do
    field :working_theory, :binary
    field :conclusion,     :binary

    embeds_many :todos, AgentRun.Todo, on_replace: :delete

    belongs_to :workbench_job, WorkbenchJob

    timestamps()
  end

  def for_workbench_job(query \\ __MODULE__, job_id) do
    from(r in query, where: r.workbench_job_id == ^job_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(r in query, order_by: ^order)
  end

  @valid ~w(working_theory conclusion workbench_job_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:todos, with: &AgentRun.todo_changeset/2)
    |> foreign_key_constraint(:workbench_job_id)
    |> unique_constraint(:workbench_job_id)
  end
end
