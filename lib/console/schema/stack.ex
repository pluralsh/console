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
    User,
    ObservableMetric,
    ScmConnection
  }

  defenum Type, terraform: 0, ansible: 1
  defenum Status, queued: 0, pending: 1, running: 2, successful: 3, failed: 4, cancelled: 5

  defmodule Configuration do
    use Piazza.Ecto.Schema

    embedded_schema do
      field :image,   :string
      field :version, :string
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(image version)a)
      |> validate_required(~w(version)a)
    end
  end

  schema "stacks" do
    field :name,            :string
    field :type,            Type
    field :status,          Status
    field :approval,        :boolean
    field :sha,             :string
    field :last_successful, :string
    field :deleted_at,      :utc_datetime_usec

    field :write_policy_id,  :binary_id
    field :read_policy_id,   :binary_id

    embeds_one :git,           Service.Git, on_replace: :update
    embeds_one :job_spec,      JobSpec, on_replace: :update
    embeds_one :configuration, Configuration, on_replace: :update

    belongs_to :repository, GitRepository
    belongs_to :cluster,    Cluster
    belongs_to :delete_run, StackRun
    belongs_to :connection, ScmConnection

    has_one :state, StackState, on_replace: :update

    has_many :environment, StackEnvironment, on_replace: :delete
    has_many :files,       StackFile, on_replace: :delete
    has_many :output,      StackOutput, on_replace: :delete
    has_many :runs,        StackRun

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

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(s in query,
        left_join: b in PolicyBinding,
          on: b.policy_id == s.read_policy_id or b.policy_id == s.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(s in query, order_by: ^order)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(name type status approval connection_id repository_id cluster_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:git)
    |> cast_embed(:job_spec)
    |> cast_embed(:configuration)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:environment)
    |> cast_assoc(:files)
    |> cast_assoc(:observable_metrics)
    |> foreign_key_constraint(:repository_id)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:connection_id)
    |> unique_constraint(:name)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required(~w(name type status)a)
  end

  def complete_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(status last_successful)a)
    |> cast_assoc(:output)
    |> cast_assoc(:state)
    |> validate_required(~w(status)a)
  end

  def delete_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(deleted_at delete_run_id)a)
  end
end
