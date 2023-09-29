defmodule Console.Schema.Cluster do
  use Piazza.Ecto.Schema
  import Console.Deployments.Ecto.Validations
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{Service, ClusterNodePool, NamespacedName, ClusterProvider, PolicyBinding, User, Tag, GlobalService}

  defmodule Kubeconfig do
    use Piazza.Ecto.Schema
    alias Console.Schema.NamespacedName

    embedded_schema do
      field :raw, Piazza.Ecto.EncryptedString
      embeds_one :secret_ref, NamespacedName, on_replace: :update
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, [:raw])
      |> cast_embed(:secret_ref)
    end
  end

  defmodule CloudSettings do
    use Piazza.Ecto.Schema

    embedded_schema do
      # just temporary until we know what of these will actually matter
      embeds_one :aws, Aws, on_replace: :update do
        field :logging, :boolean
      end
    end

    def changeset(model, attrs \\ %{}) do
      cast(model, attrs, [])
      |> cast_embed(:aws, with: &aws_changeset/2)
    end

    def aws_changeset(model, attrs) do
      cast(model, attrs, ~w(logging)a)
    end
  end

  schema "clusters" do
    field :handle,          :string
    field :name,            :string
    field :self,            :boolean

    field :version,         :string
    field :current_version, :string
    field :deploy_token,    :string
    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id
    field :deleted_at,      :utc_datetime_usec
    field :pinged_at,       :utc_datetime_usec

    field :token_readable,  :boolean, default: false, virtual: true

    embeds_one :resource,       NamespacedName
    embeds_one :kubeconfig,     Kubeconfig, on_replace: :update
    embeds_one :cloud_settings, CloudSettings, on_replace: :update

    belongs_to :provider, ClusterProvider
    belongs_to :service,  Service
    has_many :node_pools, ClusterNodePool, on_replace: :delete
    has_many :services, Service
    has_many :tags, Tag
    has_many :api_deprecations, through: [:services, :api_deprecations]

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

  def ignore_ids(query \\ __MODULE__, ids) do
    from(c in query, where: c.id not in ^ids)
  end

  def target(query \\ __MODULE__, %GlobalService{} = global) do
    Map.take(global, [:provider_id, :tags])
    |> Enum.reduce(query, fn
      {:provider_id, prov_id}, q -> for_provider(q, prov_id)
      {:tags, [_ | _] = tags}, q -> for_tags(q, tags)
      _, q -> q
    end)
  end

  def without_global(query \\ __MODULE__, global_id) do
    owned = Service.for_owner(global_id)
    from(c in query,
      left_join: s in subquery(owned),
      where: is_nil(s.id),
      distinct: true
    )
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

  def with_tag(query \\ __MODULE__, name, value) do
    from(c in query,
      join: t in assoc(c, :tags),
      where: t.value == ^value and t.name == ^name
    )
  end

  def for_tags(query \\ __MODULE__, tags) do
    Enum.reduce(tags, query, fn %{name: n, value: v}, q -> with_tag(q, n, v) end)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(c in query, order_by: ^order)
  end

  def deleted(query \\ __MODULE__) do
    from(c in query, where: not is_nil(c.deleted_at))
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(provider_id service_id self version current_version name handle)a

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
    |> cast_assoc(:tags)
    |> foreign_key_constraint(:provider_id)
    |> put_new_change(:deploy_token, fn -> "deploy-#{Console.rand_alphanum(30)}" end)
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
