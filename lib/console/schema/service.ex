defmodule Console.Schema.Service do
  use Piazza.Ecto.Schema
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{
    User,
    Cluster,
    ClusterProvider,
    GitRepository,
    Revision,
    ServiceComponent,
    PolicyBinding
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

    has_one :reference_cluster, Cluster
    has_one :provider, ClusterProvider

    has_many :components, ServiceComponent, on_replace: :delete
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

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(s in query, order_by: ^order)
  end

  @valid ~w(name version sha cluster_id repository_id namespace)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:git)
    |> cast_assoc(:components)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:repository_id)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:name, :version, :cluster_id, :repository_id])
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end
end
