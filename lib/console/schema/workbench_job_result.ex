defmodule Console.Schema.WorkbenchJobResult do
  use Piazza.Ecto.Schema
  alias Console.Schema.WorkbenchJob

  defenum TodoStatus, pending: 0, in_progress: 1, completed: 2

  schema "workbench_job_results" do
    field :working_theory, :binary
    field :conclusion,     :binary

    embeds_many :todos, Todo, on_replace: :delete do
      field :name,        :string
      field :description, :string
      field :status,      TodoStatus
    end

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
    |> cast_embed(:todos, with: &todo_changeset/2)
    |> foreign_key_constraint(:workbench_job_id)
    |> unique_constraint(:workbench_job_id)
  end

  defp todo_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name description status)a)
    |> validate_required([:name, :description, :status])
  end
end
