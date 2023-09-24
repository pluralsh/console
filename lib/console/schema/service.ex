defmodule Console.Schema.Service do
  use Piazza.Ecto.Schema
  import Console.Deployments.Ecto.Validations
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{
    User,
    Cluster,
    ClusterProvider,
    GitRepository,
    Revision,
    ServiceComponent,
    PolicyBinding,
    GlobalService,
    ServiceError
  }

  defmodule Git do
    use Piazza.Ecto.Schema

    embedded_schema do
      field :ref,    :string
      field :folder, :string
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(ref folder)a)
      |> validate_required(~w(ref folder)a)
    end
  end

  schema "services" do
    field :name,            :string
    field :version,         :string
    field :sha,             :string
    field :namespace,       :string
    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id
    field :deleted_at,      :utc_datetime_usec

    embeds_one :git, Git, on_replace: :update

    belongs_to :revision, Revision
    belongs_to :cluster, Cluster
    belongs_to :repository, GitRepository
    belongs_to :owner, GlobalService

    has_one :reference_cluster, Cluster
    has_one :provider, ClusterProvider
    has_one :global_service, GlobalService

    has_many :errors, ServiceError, on_replace: :delete
    has_many :components, ServiceComponent, on_replace: :delete
    has_many :api_deprecations, through: [:components, :api_deprecations]
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

  def drainable(query \\ __MODULE__) do
    from(s in query, where: s.name != "deploy-operator")
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(s in query,
        join: c in assoc(s, :cluster),
        left_join: b in PolicyBinding,
          on: b.policy_id == c.read_policy_id or b.policy_id == c.write_policy_id
                or b.policy_id == s.read_policy_id or b.policy_id == s.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def for_provider(query \\ __MODULE__, provider_id) do
    from(s in query,
      join: c in assoc(s, :cluster),
      where: c.provider_id == ^provider_id
    )
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(s in query, where: s.cluster_id == ^cluster_id)
  end

  def for_owner(query \\ __MODULE__, owner_id) do
    from(s in query, where: s.owner_id == ^owner_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(s in query, order_by: ^order)
  end

  def deleted(query \\ __MODULE__) do
    from(s in query, where: not is_nil(s.deleted_at))
  end

  @valid ~w(name version sha cluster_id repository_id namespace owner_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> kubernetes_names([:name, :namespace])
    |> semver(:version)
    |> cast_embed(:git)
    |> cast_assoc(:components)
    |> cast_assoc(:errors)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:owner_id)
    |> foreign_key_constraint(:repository_id)
    |> unique_constraint([:cluster_id, :name])
    |> unique_constraint([:cluster_id, :owner_id])
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:name, :version, :cluster_id, :repository_id])
  end

  def rollback_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(revision_id sha)a)
    |> cast_embed(:git)
    |> validate_required(~w(revision_id)a)
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end
end
