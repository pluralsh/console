defmodule Console.Schema.Stack do
  use Piazza.Ecto.Schema
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{
    Service,
    Cluster,
    GitRepository,
    Gates.JobSpec,
    PolicyBinding,
    StackState,
    StackRun,
    StackEnvironment,
    StackOutput,
    StackFile,
    StackCron,
    User,
    ObservableMetric,
    ScmConnection,
    Tag,
    Service,
    Project,
    StackDefinition,
    AiInsight
  }

  defenum Type, terraform: 0, ansible: 1, custom: 2
  defenum Status,
    queued: 0,
    pending: 1,
    running: 2,
    successful: 3,
    failed: 4,
    cancelled: 5,
    pending_approval: 6

  defguard is_terminal(s) when s in ~w(failed cancelled successful)a

  def running_states(), do: ~w(pending running pending_approval)a

  defmodule Configuration do
    use Piazza.Ecto.Schema

    embedded_schema do
      field :image,   :string
      field :version, :string
      field :tag,     :string

      embeds_many :hooks, Hook, on_replace: :delete do
        field :cmd,         :string
        field :args,        {:array, :string}
        field :after_stage, Console.Schema.RunStep.Stage
      end

      embeds_one :terraform, Terraform, on_replace: :update do
        field :parallelism, :integer
        field :refresh,     :boolean
      end
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(image version tag)a)
      |> cast_embed(:hooks, with: &hook_changeset/2)
      |> cast_embed(:terraform, with: &terraform_changeset/2)
    end

    defp hook_changeset(model, attrs) do
      model
      |> cast(attrs, ~w(cmd args after_stage)a)
      |> validate_required(~w(cmd after_stage)a)
    end

    defp terraform_changeset(model, attrs) do
      model
      |> cast(attrs, ~w(parallelism refresh)a)
    end
  end

  defmodule PolicyEngine do
    use Piazza.Ecto.Schema

    defenum Type, trivy: 0

    embedded_schema do
      field :type, Type
      field :max_severity, Console.Schema.Vulnerability.Severity
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(type max_severity)a)
      |> validate_required(~w(type)a)
    end
  end

  schema "stacks" do
    field :name,            :string
    field :type,            Type
    field :status,          Status
    field :paused,          :boolean, default: false
    field :approval,        :boolean
    field :sha,             :string
    field :last_successful, :string
    field :deleted_at,      :utc_datetime_usec
    field :manage_state,    :boolean, default: false
    field :workdir,         :string
    field :locked_at,       :utc_datetime_usec
    field :polled_sha,      :string
    field :variables,       :map
    field :agent_id,        :string

    field :actor_changed, :boolean, virtual: true
    field :runnable,      :boolean, virtual: true

    field :write_policy_id,  :binary_id
    field :read_policy_id,   :binary_id

    embeds_one :policy_engine, PolicyEngine, on_replace: :update
    embeds_one :git,           Service.Git, on_replace: :update
    embeds_one :job_spec,      JobSpec, on_replace: :update
    embeds_one :configuration, Configuration, on_replace: :update

    belongs_to :repository, GitRepository
    belongs_to :cluster,    Cluster
    belongs_to :delete_run, StackRun
    belongs_to :connection, ScmConnection
    belongs_to :actor,      User
    belongs_to :project,    Project
    belongs_to :parent,     Service
    belongs_to :definition, StackDefinition
    belongs_to :insight,    AiInsight, on_replace: :update

    has_one :state, StackState,
      on_replace: :update,
      foreign_key: :stack_id

    has_one :cron, StackCron,
      on_replace: :update,
      foreign_key: :stack_id

    has_many :environment, StackEnvironment, on_replace: :delete
    has_many :files,       StackFile, on_replace: :delete
    has_many :output,      StackOutput, on_replace: :delete
    has_many :runs,        StackRun
    has_many :tags,        Tag, on_replace: :delete

    has_many :observable_metrics, ObservableMetric, on_replace: :delete

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    timestamps()
  end

  def lock(query \\ __MODULE__), do: from(s in query, lock: "FOR UPDATE")

  def search(query \\ __MODULE__, sq) do
    from(s in query, where: ilike(s.name, ^"#{sq}%"))
  end

  def for_project(query \\ __MODULE__, pid) do
    from(s in query, where: s.project_id == ^pid)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(s in query,
        join: p in assoc(s, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == s.read_policy_id or b.policy_id == s.write_policy_id
            or b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups
      )
    end)
  end

  def distinct(query \\ __MODULE__), do: from(s in query, distinct: true)

  def with_tag_query(query \\ __MODULE__, tq) do
    tags = Tag.for_query(Tag, tq, :stack_id)
    from(c in query,
      join: t in subquery(tags),
        on: t.stack_id == c.id
    )
  end

  def unpaused(query \\ __MODULE__) do
    from(s in query, where: not s.paused or is_nil(s.paused))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(s in query, order_by: ^order)
  end

  def for_status(query \\ __MODULE__, status) do
    from(s in query, where: s.status == ^status)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  def stats(query \\ __MODULE__) do
    from(s in query,
      select: %{
        unhealthy: count(fragment("CASE WHEN ? = 4 THEN ? ELSE null END", s.status, s.id), :distinct),
        count: count(s.id, :distinct)
      }
    )
  end

  @valid ~w(name type paused actor_id parent_id variables definition_id workdir manage_state status approval project_id connection_id repository_id cluster_id)a
  @immutable ~w(project_id)a


  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:git)
    |> cast_embed(:job_spec)
    |> cast_embed(:configuration)
    |> cast_embed(:policy_engine)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:environment)
    |> cast_assoc(:files)
    |> cast_assoc(:cron)
    |> cast_assoc(:observable_metrics)
    |> cast_assoc(:tags)
    |> cast_assoc(:insight)
    |> foreign_key_constraint(:repository_id)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:connection_id)
    |> foreign_key_constraint(:actor_id)
    |> unique_constraint(:name)
    |> validate_length(:name, max: 255, message: "name must be less than 255 characters")
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> change_markers(actor_id: :actor_changed)
    |> determine_runnable()
    |> validate_required(~w(name type status project_id)a)
  end

  def update_changeset(changeset) do
    Enum.reduce(@immutable, changeset, fn field, cs ->
      case get_change(cs, field) do
        nil -> cs
        _ -> add_error(cs, field, "Field is immutable")
      end
    end)
  end

  def complete_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(status last_successful)a)
    |> cast_assoc(:output)
    |> cast_assoc(:state)
    |> validate_required(~w(status)a)
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end

  def delete_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(deleted_at delete_run_id)a)
  end

  def lock_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(locked_at)a)
  end

  defp determine_runnable(cs) do
    significant = Enum.any?(~w(files environment variables git job_spec configuration)a, &get_change(cs, &1))
    put_change(cs, :runnable, significant)
  end
end
