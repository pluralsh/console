defmodule Console.Schema.AgentRuntime do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, PolicyBinding}
  alias Console.Deployments.Policies.Rbac

  defenum Type, claude: 0, opencode: 1

  schema "agent_runtimes" do
    field :name,             :string
    field :type,             Type
    field :default,          :boolean, default: false
    field :create_policy_id, :binary_id

    field :ai_proxy, :boolean, default: false

    belongs_to :cluster, Cluster

    has_many :create_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :create_policy_id

    timestamps()
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

  @valid ~w(name type ai_proxy default)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:default, message: "only one default runtime can be set at once")
    |> unique_constraint(:name, name: :agent_runtimes_cluster_id_name_uniq_index, message: "a runtime with this name already exists for this cluster")
    |> validate_length(:name, max: 255)
    |> validate_required(@valid)
    |> put_new_change(:create_policy_id, &Ecto.UUID.generate/0)
    |> cast_assoc(:create_bindings)
  end
end
