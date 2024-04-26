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
    ServiceError,
    DiffNormalizer,
    Metadata,
    StageService,
    ServiceContextBinding,
    NamespaceInstance,
    ServiceDependency
  }

  defenum Promotion, ignore: 0, proceed: 1, rollback: 2
  defenum Status, stale: 0, synced: 1, healthy: 2, failed: 3, paused: 4

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

  defmodule Helm do
    use Piazza.Ecto.Schema
    alias Console.Schema.{NamespacedName, Service.Git}

    embedded_schema do
      field :values,        Piazza.Ecto.EncryptedString
      field :chart,         :string
      field :version,       :string
      field :release,       :string
      field :values_files,  {:array, :string}
      field :repository_id, :binary_id

      embeds_many :set, HelmValue, on_replace: :delete do
        field :name, :string
        field :value, Piazza.Ecto.EncryptedString
      end

      embeds_one :git,        Git, on_replace: :update
      embeds_one :repository, NamespacedName, on_replace: :update
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(values release chart version repository_id values_files)a)
      |> cast_embed(:repository)
      |> cast_embed(:set, with: &set_changeset/2)
      |> cast_embed(:git)
      |> validate_change(:values_files, fn :values_files, files ->
        case Enum.member?(files, "values.yaml") do
          true -> [values_files: "explicitly wiring in values.yaml can corrupt helm charts, try a different filename"]
          _ -> []
        end
      end)
      |> ensure_chart()
    end

    def set_changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(name value)a)
      |> validate_required(~w(name value)a)
      |> ensure_chart()
    end

    defp ensure_chart(cs) do
      case get_field(cs, :repository) do
        %{} -> validate_required(cs, ~w(chart version)a)
        _ -> cs
      end
    end
  end

  schema "services" do
    field :name,             :string
    field :component_status, :string
    field :version,          :string
    field :promotion,        Promotion
    field :proceed,          :boolean, default: false
    field :templated,        :boolean, default: true
    field :sha,              :string
    field :namespace,        :string
    field :docs_path,        :string
    field :message,          :string
    field :status,           Status, default: :stale
    field :write_policy_id,  :binary_id
    field :read_policy_id,   :binary_id
    field :deleted_at,       :utc_datetime_usec
    field :protect,          :boolean
    field :dry_run,          :boolean
    field :interval,         :string

    field :norevise, :boolean, virtual: true, default: false

    embeds_one :git,  Git,  on_replace: :update
    embeds_one :helm, Helm, on_replace: :update

    embeds_one :sync_config, SyncConfig, on_replace: :update do
      embeds_many :diff_normalizers, DiffNormalizer
      embeds_one :namespace_metadata, Metadata
      field :create_namespace, :boolean, default: true
    end

    embeds_one :kustomize, Kustomize, on_replace: :update do
      field :path, :string
    end

    belongs_to :revision,   Revision
    belongs_to :cluster,    Cluster
    belongs_to :repository, GitRepository
    belongs_to :owner,      GlobalService

    has_one :reference_cluster,  Cluster
    has_one :provider,           ClusterProvider
    has_one :global_service,     GlobalService
    has_one :namespace_instance, NamespaceInstance

    has_many :errors, ServiceError, on_replace: :delete
    has_many :components, ServiceComponent, on_replace: :delete
    has_many :context_bindings, ServiceContextBinding, on_replace: :delete
    has_many :dependencies, ServiceDependency, on_replace: :delete
    has_many :api_deprecations, through: [:components, :api_deprecations]
    has_many :contexts, through: [:context_bindings, :context]
    has_many :stage_services, StageService
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

  def search(query \\ __MODULE__, sq) do
    from(s in query, where: ilike(s.name, ^"#{sq}%"))
  end

  def drainable(query \\ __MODULE__) do
    from(s in query, where: s.name != "deploy-operator")
  end

  def nonsystem(query \\ __MODULE__) do
    from(s in query, where: s.name != "deploy-operator")
  end

  def agent(query \\ __MODULE__) do
    from(s in query, where: s.name == "deploy-operator")
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

  def for_cluster_handle(query \\ __MODULE__, handle) do
    from(s in query,
      join: c in assoc(s, :cluster),
      where: c.handle == ^handle
    )
  end

  def for_owner(query \\ __MODULE__, owner_id) do
    from(s in query, where: s.owner_id == ^owner_id)
  end

  def for_namespace(query \\ __MODULE__, ns_id) do
    from(s in query,
      join: ni in assoc(s, :namespace_instance),
      where: ni.namespace_id == ^ns_id
    )
  end

  def for_status(query \\ __MODULE__, status) do
    from(s in query, where: s.status == ^status)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :cluster_id, asc: :name]) do
    from(s in query, order_by: ^order)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  def deleted(query \\ __MODULE__) do
    from(s in query, where: not is_nil(s.deleted_at))
  end

  def statuses(query \\ __MODULE__) do
    from(s in query, group_by: s.status, select: %{status: s.status, count: count(s.id, :distinct)})
  end

  def docs_path(%__MODULE__{docs_path: p}) when is_binary(p), do: p
  def docs_path(%__MODULE__{git: %{folder: p}}), do: Path.join(p, "docs")

  @valid ~w(name protect interval docs_path component_status templated dry_run interval status version sha cluster_id repository_id namespace owner_id message)a
  @immutable ~w(cluster_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> kubernetes_names([:name, :namespace])
    |> semver(:version)
    |> validate_format(:interval, ~r/\d+[mhs]/, message: "interval must be a valid go interval string")
    |> cast_embed(:git)
    |> cast_embed(:helm)
    |> cast_embed(:sync_config, with: &sync_config_changeset/2)
    |> cast_embed(:kustomize, with: &kustomize_changeset/2)
    |> cast_assoc(:components)
    |> cast_assoc(:errors)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:context_bindings)
    |> cast_assoc(:dependencies)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:owner_id)
    |> foreign_key_constraint(:repository_id)
    |> unique_constraint([:cluster_id, :name], message: "there is already a service with that name for this cluster")
    |> unique_constraint([:cluster_id, :owner_id])
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:name, :namespace, :version, :cluster_id])
  end

  def update_changeset(changeset) do
    Enum.reduce(@immutable, changeset, fn field, cs ->
      case get_change(cs, field) do
        nil -> cs
        _ -> add_error(cs, field, "Field is immutable")
      end
    end)
  end

  def rollback_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(revision_id sha status)a)
    |> cast_embed(:git)
    |> cast_embed(:helm)
    |> cast_embed(:kustomize)
    |> validate_required(~w(revision_id)a)
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end

  def sync_config_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(create_namespace)a)
    |> cast_embed(:namespace_metadata)
    |> cast_embed(:diff_normalizers)
  end

  def kustomize_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(path)a)
    |> validate_required(~w(path)a)
  end
end
