defmodule Console.Schema.WorkbenchJob do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Workbench,
    WorkbenchJobResult,
    WorkbenchJobActivity,
    User
  }

  defenum Status, pending: 0, running: 1, successful: 2, failed: 3, cancelled: 4

  schema "workbench_jobs" do
    field :status, Status, default: :pending
    field :prompt, :binary

    field :started_at,   :utc_datetime_usec
    field :completed_at, :utc_datetime_usec

    belongs_to :workbench, Workbench
    belongs_to :user,      User

    has_one  :result, WorkbenchJobResult, on_replace: :update
    has_many :activities, WorkbenchJobActivity, on_replace: :delete

    timestamps()
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(j in query, where: j.workbench_id == ^workbench_id)
  end

  def for_status(query \\ __MODULE__, status) do
    from(j in query, where: j.status == ^status)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(j in query, order_by: ^order)
  end

  @valid ~w(status prompt workbench_id user_id started_at completed_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:result)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:user_id)
    |> validate_required([:status, :workbench_id, :user_id])
  end
end
