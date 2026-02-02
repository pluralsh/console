defmodule Console.Schema.AgentRuntime do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, PolicyBinding, ScmConnection}
  alias Console.Deployments.Policies.Rbac

  defenum Type, claude: 0, opencode: 1, gemini: 3, custom: 4

  schema "agent_runtimes" do
    field :name,                 :string
    field :type,                 Type
    field :default,              :boolean, default: false
    field :create_policy_id,     :binary_id
    field :allowed_repositories, {:array, :string}

    field :ai_proxy, :boolean, default: false

    belongs_to :cluster,    Cluster
    belongs_to :connection, ScmConnection

    has_many :create_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :create_policy_id

    timestamps()
  end

  def allowed_repository?(%__MODULE__{allowed_repositories: [_ | _] = allowed}, repo), do: Enum.member?(allowed, repo)
  def allowed_repository?(_, _), do: true

  def for_name(query \\ __MODULE__, name) do
    from(ar in query, where: ar.name == ^name)
  end

  def limit(query \\ __MODULE__, limit) do
    from(ar in query, limit: ^limit)
  end

  def for_type(query \\ __MODULE__, type) do
    from(ar in query, where: ar.type == ^type)
  end

  def for_user(query \\ __MODULE__, user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(ar in query,
        left_join: b in PolicyBinding,
          on: b.policy_id == ar.create_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(ar in query, where: ar.cluster_id == ^cluster_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(ar in query, order_by: ^order)
  end

  @valid ~w(name type ai_proxy default allowed_repositories connection_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:default, message: "only one default runtime can be set at once")
    |> unique_constraint(:name, name: :agent_runtimes_cluster_id_name_uniq_index, message: "a runtime with this name already exists for this cluster")
    |> validate_length(:name, max: 255)
    |> validate_required([:name, :type])
    |> put_new_change(:create_policy_id, &Ecto.UUID.generate/0)
    |> cast_assoc(:create_bindings)
  end
end
