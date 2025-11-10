defmodule Console.Schema.SentinelRunJob do
  use Console.Schema.Base
  alias Console.Schema.{
    Cluster,
    Service,
    GitRepository,
    SentinelRun,
    Gates.JobSpec
  }

  defenum Status, pending: 0, running: 1, success: 2, failed: 3
  defenum Format, plaintext: 0, junit: 1

  schema "sentinel_run_jobs" do
    field :check,  :string
    field :status, Status, default: :pending
    field :format, Format, default: :junit

    field :completed_at, :utc_datetime_usec

    field :output, :binary

    embeds_one :job, JobSpec, on_replace: :update

    embeds_one :reference, JobReference, on_replace: :update do
      field :namespace, :string
      field :name,      :string
    end

    embeds_one :git, Service.Git, on_replace: :update

    belongs_to :repository, GitRepository
    belongs_to :cluster, Cluster
    belongs_to :sentinel_run, SentinelRun

    timestamps()
  end

  def pending(query \\ __MODULE__) do
    from(s in query, where: s.status == :pending)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(s in query, order_by: ^order)
  end

  def for_sentinel_run(query \\ __MODULE__, sentinel_run_id) do
    from(s in query, where: s.sentinel_run_id == ^sentinel_run_id)
  end

  def for_check(query \\ __MODULE__, check_name) do
    from(s in query, where: s.check == ^check_name)
  end

  def for_status(query \\ __MODULE__, status) do
    from(s in query, where: s.status == ^status)
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(s in query, where: s.cluster_id == ^cluster_id)
  end

  def statistics(query \\ __MODULE__) do
    from(s in query, group_by: s.status, select: %{status: s.status, count: count(s.id, :distinct)})
  end

  @valid ~w(check format status cluster_id output sentinel_run_id repository_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:job)
    |> cast_embed(:git)
    |> cast_embed(:reference, with: &reference_changeset/2)
    |> validate_required(~w(check format status cluster_id sentinel_run_id)a)
    |> SentinelRun.add_completed_at()
  end

  defp reference_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(namespace name)a)
    |> validate_required(~w(namespace name)a)
  end
end
