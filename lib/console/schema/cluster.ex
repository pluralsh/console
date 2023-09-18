defmodule Console.Schema.Cluster do
  use Piazza.Ecto.Schema
  import Console.Deployments.Ecto.Validations
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{Service, ClusterNodePool, NamespacedName, ClusterProvider, PolicyBinding, User}

  schema "clusters" do
    field :name,            :string
    field :self,            :boolean

    field :version,         :string
    field :current_version, :string
    field :deploy_token,    :string
    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id
    field :deleted_at,      :utc_datetime_usec
    field :pinged_at,       :utc_datetime_usec

    embeds_one :resource,   NamespacedName
    embeds_one :kubeconfig, NamespacedName

    belongs_to :provider, ClusterProvider
    belongs_to :service,  Service
    has_many :node_pools, ClusterNodePool, on_replace: :delete

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

  def for_service(query \\ __MODULE__, service_id) do
    from(c in query, where: c.service_id == ^service_id)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(c in query,
        left_join: b in PolicyBinding,
          on: b.policy_id == c.read_policy_id or b.policy_id == c.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def for_provider(query \\ __MODULE__, provider_id) do
    from(c in query, where: c.provider_id == ^provider_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(c in query, order_by: ^order)
  end

  def deleted(query \\ __MODULE__) do
    from(c in query, where: not is_nil(c.deleted_at))
  end

  @valid ~w(provider_id service_id self version current_version name)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> kubernetes_name(:name)
    |> semver(:version)
    |> cast_embed(:kubeconfig)
    |> cast_embed(:resource)
    |> cast_assoc(:node_pools)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> foreign_key_constraint(:provider_id)
    |> put_new_change(:deploy_token, fn -> "deploy-#{Console.rand_alphanum(20)}" end)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> update_vsn()
    |> validate_required(~w(name version)a)
  end

  def update_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(version)a)
    |> cast_assoc(:node_pools)
  end

  def ping_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(pinged_at current_version)a)
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end

  defp update_vsn(cs) do
    with current when is_binary(current) <- get_field(cs, :current_version),
         vsn when is_binary(vsn) <- get_field(cs, :version),
         {:ok, current_parsed} <- Version.parse(clean_version(current)),
         {:ok, vsn} <- Version.parse(clean_version(vsn)),
         :gt <- Version.compare(current_parsed, vsn) do
      put_change(cs, :version, current)
    else
      _ -> cs
    end
  end
end
