defmodule Console.Schema.Cluster do
  use Piazza.Ecto.Schema
  import Console.Deployments.Ecto.Validations
  alias Console.Deployments.{Policies.Rbac, Settings}
  alias Console.Schema.{
    Service,
    ClusterNodePool,
    NamespacedName,
    ClusterProvider,
    PolicyBinding,
    User,
    Tag,
    ProviderCredential,
    ServiceError,
    PrAutomation,
    ClusterRestore,
    ObjectStore,
    Project,
    UpgradeInsight,
    AiInsight,
    ClusterInsightComponent,
    CloudAddon,
    OperationalLayout,
    DeprecatedCustomResource,
    NodeStatistic
  }

  defenum Distro, generic: 0, eks: 1, aks: 2, gke: 3, rke: 4, k3s: 5

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
      embeds_one :gcp, Gcp, on_replace: :update do
        field :project, :string
        field :network, :string
        field :region,  :string
      end

      embeds_one :aws, Aws, on_replace: :update do
        field :region, :string
      end

      embeds_one :azure, Azure, on_replace: :update do
        field :location,        :string
        field :subscription_id, :string
        field :resource_group,  :string
        field :network,         :string
      end
    end

    def changeset(model, attrs \\ %{}) do
      cast(model, attrs, [])
      |> cast_embed(:aws, with: &aws_changeset/2)
      |> cast_embed(:gcp, with: &gcp_changeset/2)
      |> cast_embed(:azure, with: &azure_changeset/2)
    end

    def aws_changeset(model, attrs) do
      cast(model, attrs, ~w(region)a)
    end

    def gcp_changeset(model, attrs) do
      cast(model, attrs, ~w(project network region)a)
      |> validate_required(~w(project network region)a)
    end

    def azure_changeset(model, attrs) do
      cast(model, attrs, ~w(location subscription_id resource_group network)a)
      |> validate_required(~w(location resource_group)a)
    end
  end

  schema "clusters" do
    field :handle,          :string
    field :name,            :string
    field :self,            :boolean, default: false
    field :installed,       :boolean, default: false
    field :protect,         :boolean, default: false
    field :virtual,         :boolean, default: false
    field :distro,          Distro, default: :generic
    field :metadata,        :map
    field :health_score,    :integer

    field :version,         :string
    field :current_version, :string
    field :kubelet_version, :string
    field :deploy_token,    :string
    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id
    field :deleted_at,      :utc_datetime_usec
    field :pinged_at,       :utc_datetime_usec

    field :distro_changed,  :boolean, default: false, virtual: true
    field :token_readable,  :boolean, default: false, virtual: true

    embeds_one :upgrade_plan, UpgradePlan, on_replace: :update do
      boolean_fields [:deprecations, :compatibilities, :incompatibilities, :kubelet_skew]
    end

    embeds_one :resource,       NamespacedName
    embeds_one :kubeconfig,     Kubeconfig, on_replace: :update
    embeds_one :cloud_settings, CloudSettings, on_replace: :update

    belongs_to :provider,       ClusterProvider
    belongs_to :service,        Service
    belongs_to :credential,     ProviderCredential
    belongs_to :object_store,   ObjectStore
    belongs_to :restore,        ClusterRestore
    belongs_to :project,        Project
    belongs_to :insight,        AiInsight, on_replace: :update
    belongs_to :parent_cluster, __MODULE__

    has_one :operational_layout, OperationalLayout, on_replace: :update

    has_many :upgrade_insights, UpgradeInsight
    has_many :cloud_addons, CloudAddon
    has_many :node_pools, ClusterNodePool, on_replace: :delete
    has_many :service_errors, ServiceError, on_replace: :delete
    has_many :services, Service
    has_many :tags, Tag, on_replace: :delete
    has_many :api_deprecations, through: [:services, :api_deprecations]
    has_many :insight_components, ClusterInsightComponent, on_replace: :delete
    has_many :deprecated_custom_resources, DeprecatedCustomResource, on_replace: :delete
    has_many :node_statistics, NodeStatistic, on_replace: :delete

    has_many :pr_automations, PrAutomation, on_replace: :delete
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

  def healthy?(%__MODULE__{pinged_at: nil}), do: false
  def healthy?(%__MODULE__{pinged_at: pinged}) do
    Timex.now()
    |> Timex.shift(minutes: -20)
    |> Timex.before?(pinged)
  end

  defp upgrade_plan_fields(), do: __MODULE__.UpgradePlan.__schema__(:fields) -- [:id]

  def search(query \\ __MODULE__, sq) do
    from(c in query, where: ilike(c.name, ^"#{sq}%") or ilike(c.handle, ^"#{sq}%"))
  end

  def with_insight_components(query \\ __MODULE__) do
    from(c in query,
      left_join: ic in assoc(c, :insight_components),
      where: not is_nil(ic.id),
      distinct: true
    )
  end

  def with_limit(query \\ __MODULE__, limit) do
    from(c in query, limit: ^limit)
  end

  def with_backups(query \\ __MODULE__, enabled)
  def with_backups(query, true) do
    from(c in query, left_join: o in assoc(c, :object_store), where: not is_nil(o.id))
  end
  def with_backups(query, false) do
    from(c in query, left_join: o in assoc(c, :object_store), where: is_nil(o.id))
  end

  def ignore_ids(query \\ __MODULE__, ids) do
    from(c in query, where: c.id not in ^ids)
  end

  def for_namespace(query \\ __MODULE__, ns) do
    from(c in query,
      left_join: p in assoc(c, :provider),
      left_join: cred in assoc(c, :credential),
      where: (not is_nil(cred.id) and cred.namespace == ^ns) or (is_nil(cred.id) and not is_nil(p.id) and p.namespace == ^ns),
      distinct: true
    )
  end

  def for_name(query \\ __MODULE__, name) do
    from(c in query, where: c.name == ^name)
  end

  def for_flow(query \\ __MODULE__, flow_id) do
    from(c in query,
      join: s in assoc(c, :services),
      where: s.flow_id == ^flow_id,
      distinct: true
    )
  end

  def target(query \\ __MODULE__, %{} = resource) do
    Map.take(resource, [:provider_id, :project_id, :tags, :distro])
    |> Enum.reduce(query, fn
      {:distro, distro}, q when not is_nil(distro) -> for_distro(q, distro)
      {:provider_id, prov_id}, q when is_binary(prov_id) -> for_provider(q, prov_id)
      {:project_id, proj_id}, q when is_binary(proj_id) -> for_project(q, proj_id)
      {:tags, [_ | _] = tags}, q -> for_tags(q, tags)
      {:tags, %{} = tags}, q -> for_tags(q, tags)
      _, q -> q
    end)
  end

  def or_ids(query \\ __MODULE__, ids)
  def or_ids(query, []), do: query
  def or_ids(query, ids) do
    from(c in query, or_where: c.id in ^ids)
  end

  def without_global(query \\ __MODULE__, global_id) do
    owned = Service.for_owner(global_id)
    from(c in query,
      left_join: s in subquery(owned),
        on: s.cluster_id == c.id,
      where: is_nil(s.id),
      distinct: true
    )
  end

  def for_service(query \\ __MODULE__, service_id) do
    from(c in query, where: c.service_id == ^service_id)
  end

  def for_project(query \\ __MODULE__, pid) do
    from(c in query, where: c.project_id == ^pid)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      sub = Service.for_user(user)
      from(c in query,
        left_join: s in subquery(sub),
          on: s.cluster_id == c.id,
        join: p in assoc(c, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == c.read_policy_id or b.policy_id == c.write_policy_id
                or b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups or not is_nil(s.id),
        distinct: true
      )
    end)
  end

  def for_provider(query \\ __MODULE__, provider_id) do
    from(c in query, where: c.provider_id == ^provider_id)
  end

  def for_distro(query \\ __MODULE__, distro) do
    from(c in query, where: c.distro == ^distro)
  end

  def for_parent(query \\ __MODULE__, parent_id) do
    from(c in query, where: c.parent_cluster_id == ^parent_id)
  end

  def statistics(query \\ __MODULE__) do
    expired = health_threshold()
    nested = from(c in __MODULE__, select: %{healthy: c.pinged_at > ^expired, id: c.id})
    from(c in query,
      join: n in subquery(nested),
        on: n.id == c.id,
      group_by: n.healthy,
      select: %{healthy: n.healthy, count: count(c.id, :distinct)}
    )
  end

  def upgradeable(query \\ __MODULE__) do
    from(c in query,
      where: not is_nil(c.upgrade_plan) and fragment("? = 'true'::jsonb and ? = 'true'::jsonb and ? = 'true'::jsonb",
        c.upgrade_plan["compatibilities"], c.upgrade_plan["kubelet_skew"], c.upgrade_plan["deprecations"])
    )
  end

  def not_upgradeable(query \\ __MODULE__) do
    from(c in query,
      where: is_nil(c.upgrade_plan) or not fragment("? = 'true'::jsonb and ? = 'true'::jsonb and ? = 'true'::jsonb",
        c.upgrade_plan["compatibilities"], c.upgrade_plan["kubelet_skew"], c.upgrade_plan["deprecations"])
    )
  end

  def upgrade_statistics(query \\ __MODULE__) do
    from(c in query,
      select: %{
        count: count(c.id),
        upgradeable: sum(fragment("CASE WHEN ? = 'true'::jsonb and ? = 'true'::jsonb and ? = 'true'::jsonb THEN 1 ELSE 0 END",
          c.upgrade_plan["compatibilities"], c.upgrade_plan["kubelet_skew"], c.upgrade_plan["deprecations"])),
        latest: sum(fragment("CASE WHEN ? >= ? THEN 1 ELSE 0 END", c.current_version, ^Settings.kube_vsn())),
        compliant: sum(fragment("CASE WHEN ? >= ? THEN 1 ELSE 0 END", c.current_version, ^Settings.compliant_vsn())),
      }
    )
  end

  def stats(query \\ __MODULE__) do
    unhealthy = Timex.now() |> Timex.shift(minutes: -4)
    from(c in query,
      select: %{
        count: count(c.id),
        unhealthy: sum(fragment("CASE WHEN ? < ? THEN 1 ELSE 0 END", c.pinged_at, ^unhealthy))
      }
    )
  end

  def pinged(query \\ __MODULE__) do
    from(c in query, where: not is_nil(c.pinged_at))
  end

  def health(query \\ __MODULE__, health)
  def health(query, true) do
    expired = health_threshold()
    from(c in query, where: c.pinged_at > ^expired)
  end

  def health(query, _) do
    expired = health_threshold()
    from(c in query, where: c.pinged_at <= ^expired)
  end

  def healthy(query \\ __MODULE__), do: health(query, true)

  defp health_threshold(), do: Timex.now() |> Timex.shift(minutes: -5)

  def with_tag(query \\ __MODULE__, name, value) do
    from(c in query,
      join: t in assoc(c, :tags),
      where: t.value == ^value and t.name == ^name
    )
  end

  def with_tag_query(query \\ __MODULE__, tq) do
    tags = Tag.for_query(tq)
    from(c in query,
      join: t in subquery(tags),
        on: t.cluster_id == c.id,
      distinct: true
    )
  end

  def for_tags(query \\ __MODULE__, tags) do
    Enum.reduce(tags, query, fn
      %{name: n, value: v}, q -> with_tag(q, n, v)
      {k, v}, q -> with_tag(q, k, v)
    end)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :self, asc: :name]) do
    from(c in query, order_by: ^order)
  end

  def deleted(query \\ __MODULE__) do
    from(c in query, where: not is_nil(c.deleted_at))
  end

  def installable(query \\ __MODULE__) do
    from(c in query, where: (not is_nil(c.provider_id) or c.self) and is_nil(c.deleted_at))
  end

  def uninstalled(query \\ __MODULE__) do
    from(c in query, where: not c.installed and is_nil(c.pinged_at) and c.self and is_nil(c.deleted_at))
  end

  def installed(query \\ __MODULE__) do
    from(c in query, where: not is_nil(c.pinged_at) and not is_nil(c.current_version))
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  def preloaded(query \\ __MODULE__, preloads \\ [:provider, :credential]), do: from(c in query, preload: ^preloads)

  @valid ~w(provider_id distro metadata protect project_id service_id credential_id self version current_version name handle installed)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> kubernetes_name(:name)
    |> semver(:version)
    |> cast_embed(:kubeconfig)
    |> cast_embed(:resource)
    |> cast_embed(:cloud_settings)
    |> cast_embed(:upgrade_plan, with: &upgrade_plan_cs/2)
    |> cast_assoc(:node_pools)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:service_errors)
    |> cast_assoc(:tags)
    |> cast_assoc(:insight)
    |> cast_assoc(:operational_layout)
    |> foreign_key_constraint(:project_id)
    |> foreign_key_constraint(:provider_id)
    |> foreign_key_constraint(:credential_id)
    |> foreign_key_constraint(:id, name: :global_services, match: :prefix, message: "Cannot delete due to existing undeletable services bound to this cluster")
    |> foreign_key_constraint(:id, name: :services, match: :prefix, message: "Cannot delete due to existing undeletable services bound to this cluster")
    |> foreign_key_constraint(:id, name: :stacks, match: :prefix, message: "cannot delete due to stacks referencing this cluster")
    |> unique_constraint(:handle)
    |> unique_constraint([:name, :provider_id, :credential_id])
    |> put_new_change(:deploy_token, fn -> "deploy-#{Console.rand_alphanum(50)}" end)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> backfill_handle()
    |> validate_vsn()
    |> update_vsn()
    |> validate_required(~w(name handle project_id)a)
  end

  def update_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(version)a)
    |> semver(:version)
    |> cast_assoc(:node_pools)
    |> cast_assoc(:tags)
    |> validate_vsn()
  end

  def ping_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(pinged_at distro health_score kubelet_version current_version installed)a)
    |> cast_assoc(:insight_components)
    |> cast_assoc(:node_statistics)
    |> change_markers(distro: :distro_changed)
    |> update_vsn()
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end

  defp upgrade_plan_cs(model, attrs) do
    model
    |> cast(attrs, upgrade_plan_fields())
  end

  defp backfill_handle(cs) do
    case {get_field(cs, :handle), get_field(cs, :name)} do
      {nil, n} -> put_change(cs, :handle, n)
      _ -> cs
    end
  end

  defp validate_vsn(cs) do
    case {get_change(cs, :version), cs.data.version, cs.data.current_version, valid_semver?(cs.data.version)} do
      {vsn, old, current, true} when is_binary(vsn) and is_binary(old) and is_binary(current) and old != current ->
        add_error(cs, :version, "cannot upgrade while an upgrade is still in progress")
      {v, _, prev, _} when is_binary(v) and is_binary(prev) ->
        validate_vsn(cs, v, prev)
      {v, prev, _, _} when is_binary(v) and is_binary(prev) ->
        validate_vsn(cs, v, prev)
      _ -> cs
    end
  end

  defp validate_vsn(cs, v, prev) do
    case next_version?(v, prev) do
      true -> cs
      _ -> add_error(cs, :version, "version #{v} is not one minor vsn or less higher than #{prev}")
    end
  end

  defp update_vsn(cs) do
    with current when is_binary(current) <- get_field(cs, :current_version),
         vsn when is_binary(vsn) <- get_field(cs, :version),
         {:ok, current_parsed} <- Version.parse(clean_version(current)),
         {:ok, vsn} <- Version.parse(minimal_coerce(vsn)),
         :gt <- Version.compare(current_parsed, vsn) do
      put_change(cs, :version, current)
    else
      _ -> cs
    end
  end

  defp valid_semver?(vsn) when is_binary(vsn) do
    case Version.parse(minimal_coerce(vsn)) do
      {:ok, _} -> true
      _ -> false
    end
  end
  defp valid_semver?(_), do: false

  defp minimal_coerce("v" <> vsn), do: vsn
  defp minimal_coerce(vsn), do: vsn

  defimpl Solid.Matcher do
    def match(cluster, ["name"]), do: {:ok, cluster.name}
    def match(cluster, ["handle"]), do: {:ok, cluster.handle}
    def match(cluster, ["distro"]), do: {:ok, cluster.distro}
    def match(cluster, ["version"]), do: {:ok, cluster.version}
    def match(cluster, ["currentVersion"]), do: {:ok, cluster.current_version}
    def match(cluster, ["kubeletVersion"]), do: {:ok, cluster.kubelet_version}
    def match(cluster, ["metadata" | rest]), do: @protocol.match(cluster.metadata, rest)
    def match(_, _), do: {:error, :not_found}
  end
end
