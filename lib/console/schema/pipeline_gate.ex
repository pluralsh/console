defmodule Console.Schema.PipelineGate do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PipelineEdge, User, Cluster, Gates.JobSpec, Sentinel, SentinelRun}

  defenum Type, approval: 0, window: 1, job: 2, sentinel: 3
  defenum State, pending: 0, open: 1, closed: 2, running: 3

  schema "pipeline_gates" do
    field :name,  :string
    field :state, State, default: :closed
    field :type,  Type

    embeds_one :spec, Spec, on_replace: :update do
      embeds_one :job, JobSpec, on_replace: :update
    end

    embeds_one :status, Status, on_replace: :update do
      embeds_one :job_ref, JobRef, on_replace: :update do
        field :name,      :string
        field :namespace, :string
      end
    end

    belongs_to :cluster,      Cluster
    belongs_to :sentinel,     Sentinel
    belongs_to :sentinel_run, SentinelRun
    belongs_to :edge,         PipelineEdge
    belongs_to :approver,     User

    timestamps()
  end

  def for_stage(query \\ __MODULE__, stage_id) do
    from(g in query,
      join: e in assoc(g, :edge),
      where: e.from_id == ^stage_id
    )
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(g in query, where: g.cluster_id == ^cluster_id)
  end

  def for_pipeline(query \\ __MODULE__, pipeline_id) do
    from(g in query,
      join: e in assoc(g, :edge),
      where: e.pipeline_id == ^pipeline_id
    )
  end

  def for_agent(query \\ __MODULE__) do
    from(g in query, where: g.type == :job)
  end

  def for_sentinel(query \\ __MODULE__, sentinel_id) do
    from(g in query, where: g.sentinel_id == ^sentinel_id)
  end

  def for_sentinel_run(query \\ __MODULE__, sentinel_run_id) do
    from(g in query, where: g.sentinel_run_id == ^sentinel_run_id)
  end

  def pending(query \\ __MODULE__) do
    from(g in query, where: g.state == :pending)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(g in query, order_by: ^order)
  end

  @terminal ~w(open closed)a

  def valid_transition?(state, :pending) when state in @terminal, do: false
  def valid_transition?(:pending, state) when state in @terminal, do: true
  def valid_transition?(state, state), do: true
  def valid_transition?(nil, _), do: true
  def valid_transition?(_, _), do: false

  @valid ~w(name state type edge_id cluster_id approver_id sentinel_id sentinel_run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:spec, with: &spec_changeset/2)
    |> validate_state()
    |> foreign_key_constraint(:edge_id)
    |> foreign_key_constraint(:approver_id)
    |> validate_format(:name, ~r/[a-z0-9][ -a-z0-9]*[a-z0-9]/, message: "Gate names must be lowercase alphanumeric, or separated by spaces or hyphens")
    |> validate_required([:name, :state, :type])
  end

  def update_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:state])
    |> cast_embed(:status, with: &status_changeset/2)
  end

  defp spec_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:job)
  end

  defp status_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:job_ref, with: &job_ref_changeset/2)
  end

  defp job_ref_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name namespace)a)
    |> validate_required(~w(name namespace)a)
  end

  defp validate_state(cs) do
    current = cs.data.state
    validate_change(cs, :state, fn _, val ->
      case valid_transition?(current, val) do
        true -> []
        false -> [state: "cannot transition gate state from #{current} to #{val}"]
      end
    end)
  end
end
