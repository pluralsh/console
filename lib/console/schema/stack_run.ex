defmodule Console.Schema.StackRun do
  use Console.Schema.Base
  alias Console.Schema.{
    Service,
    Cluster,
    GitRepository,
    Gates.JobSpec,
    Stack,
    StackState,
    StackEnvironment,
    StackOutput,
    RunStep,
    StackFile,
    User,
    ServiceError,
    PullRequest,
    AiInsight,
    StackPolicyViolation
  }

  defenum ApprovalResult, approved: 0, rejected: 1, indeterminate: 2

  schema "stack_runs" do
    field :type,         Stack.Type
    field :status,       Stack.Status
    field :approval,     :boolean, default: true
    field :dry_run,      :boolean, default: false
    field :approved_at,  :utc_datetime_usec
    field :message,      :binary
    field :workdir,      :string
    field :manage_state, :boolean, default: false
    field :variables,    :map
    field :check_id,     :string

    field :cancellation_reason, :string

    embeds_one :policy_engine, Stack.PolicyEngine, on_replace: :update
    embeds_one :git,           Service.Git, on_replace: :update
    embeds_one :job_spec,      JobSpec, on_replace: :update
    embeds_one :configuration, Stack.Configuration, on_replace: :update

    embeds_one :job_ref, JobRef, on_replace: :update do
      field :name,      :string
      field :namespace, :string
    end

    embeds_one :approval_result, RunApprovalResult, on_replace: :update do
      field :reason, :string
      field :result, ApprovalResult
    end

    has_one :state, StackState,
      on_replace: :update,
      foreign_key: :run_id

    has_many :environment, StackEnvironment,
      on_replace: :delete,
      foreign_key: :run_id

    has_many :files, StackFile,
      on_replace: :delete,
      foreign_key: :run_id

    has_many :steps, RunStep,
      on_replace: :delete,
      foreign_key: :run_id

    has_many :output, StackOutput,
      on_replace: :delete,
      foreign_key: :run_id

    has_many :violations, StackPolicyViolation,
      on_replace: :delete,
      foreign_key: :run_id

    has_many :errors, ServiceError, on_replace: :delete

    belongs_to :repository,   GitRepository
    belongs_to :cluster,      Cluster
    belongs_to :stack,        Stack
    belongs_to :approver,     User
    belongs_to :pull_request, PullRequest
    belongs_to :actor,        User
    belongs_to :insight,      AiInsight, on_replace: :update

    timestamps()
  end

  def wet(query \\ __MODULE__) do
    from(r in query, where: not r.dry_run)
  end

  def dry(query \\ __MODULE__) do
    from(r in query, where: r.dry_run)
  end

  def for_stack(query \\ __MODULE__, stack_id) do
    from(r in query, where: r.stack_id == ^stack_id)
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(r in query, where: r.cluster_id == ^cluster_id)
  end

  def for_pr(query \\ __MODULE__, pr_id) do
    from(r in query, where: r.pull_request_id == ^pr_id)
  end

  def without_pr(query \\ __MODULE__) do
    from(r in query, where: is_nil(r.pull_request_id))
  end

  def pending(query \\ __MODULE__) do
    from(r in query, where: r.status == ^:pending)
  end

  def running(query \\ __MODULE__) do
    from(r in query, where: r.status in ^[:pending, :running, :pending_approval])
  end

  def for_status(query \\ __MODULE__, status) do
    from(r in query, where: r.status == ^status)
  end

  def limit(query \\ __MODULE__, limit) do
    from(r in query, limit: ^limit)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :id]) do
    from(r in query, order_by: ^order)
  end

  @valid ~w(type status workdir actor_id variables manage_state message approval check_id dry_run repository_id pull_request_id cluster_id stack_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:git)
    |> cast_embed(:job_spec)
    |> cast_embed(:configuration)
    |> cast_embed(:policy_engine)
    |> cast_embed(:job_ref, with: &job_ref_changeset/2)
    |> cast_assoc(:state)
    |> cast_assoc(:environment)
    |> cast_assoc(:steps)
    |> cast_assoc(:files)
    |> cast_assoc(:errors)
    |> cast_assoc(:insight)
    |> put_new_change(:id, &Piazza.Ecto.UUID.generate_monotonic/0)
    |> foreign_key_constraint(:repository_id)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:actor_id)
    |> validate_required(~w(type status)a)
  end

  def update_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(status)a)
    |> cast_assoc(:state)
    |> cast_assoc(:errors)
    |> cast_assoc(:violations)
    |> cast_embed(:approval_result, with: &approval_result_changeset/2)
    |> cast_embed(:job_ref, with: &job_ref_changeset/2)
    |> validate_required(~w(status)a)
  end

  def complete_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(status cancellation_reason)a)
    |> cast_assoc(:state)
    |> cast_assoc(:output)
    |> cast_assoc(:errors)
    |> cast_assoc(:violations)
    |> validate_required(~w(status)a)
  end

  @approve ~w(approver_id approved_at)a

  def approve_changeset(model, attrs) do
    model
    |> cast(attrs, @approve)
    |> validate_required(@approve)
  end

  defp job_ref_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name namespace)a)
    |> validate_required(~w(name namespace)a)
  end

  defp approval_result_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(reason result)a)
    |> validate_required(~w(reason result)a)
  end
end
