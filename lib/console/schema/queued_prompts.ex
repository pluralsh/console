defmodule Console.Schema.QueuedPrompt do
  use Console.Schema.Base
  alias Console.Schema.{User, WorkbenchJob}

  schema "queued_prompts" do
    field :prompt,       :binary
    field :dequeable_at, :utc_datetime_usec
    field :consumed_at,  :utc_datetime_usec

    belongs_to :workbench_job, WorkbenchJob
    belongs_to :user,          User

    timestamps()
  end

  def for_workbench_job(query \\ __MODULE__, job_id) do
    from(q in query, where: q.workbench_job_id == ^job_id)
  end

  def for_workbench_jobs(query \\ __MODULE__, job_ids) do
    from(q in query, where: q.workbench_job_id in ^job_ids)
  end

  def unconsumed(query \\ __MODULE__) do
    from(q in query, where: is_nil(q.consumed_at))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :dequeable_at, asc: :inserted_at]) do
    from(q in query, order_by: ^order)
  end

  def counts_by_workbench_job(query \\ __MODULE__) do
    from(q in query,
      group_by: q.workbench_job_id,
      select: {q.workbench_job_id, count(q.id)}
    )
  end

  @valid ~w(prompt user_id workbench_job_id dequeable_at consumed_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:id, &Piazza.Ecto.UUID.generate_monotonic/0)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:workbench_job_id)
    |> validate_required(@valid -- [:consumed_at])
  end

  @idle_statuses ~w(successful cancelled)a

  def dequeueable(query \\ __MODULE__) do
    from(q in query,
      join: wj in assoc(q, :workbench_job),
      where: q.dequeable_at <= ^DateTime.utc_now() and wj.status in ^@idle_statuses and is_nil(q.consumed_at),
      distinct: q.workbench_job_id,
      order_by: [asc: q.workbench_job_id, asc: q.id, asc: q.dequeable_at]
    )
  end
end
