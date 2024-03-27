defmodule Console.Schema.ManagedNamespace do
  use Piazza.Ecto.Schema
  alias Console.Schema.{NamespaceCluster, NamespaceInstance, Cluster, ServiceTemplate}

  defmodule Target do
    use Piazza.Ecto.Schema

    embedded_schema do
      field :distro, Console.Schema.Cluster.Distro
      field :tags,   {:map, :string}
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(distro)a)
      |> cast_embed(:tags, with: &tag_changeset/2)
    end

    defp tag_changeset(model, attrs) do
      model
      |> cast(attrs, ~w(name value)a)
    end
  end

  defmodule ServiceSpec do
    use Piazza.Ecto.Schema
    alias Console.Schema.Service

    embedded_schema do
      field :templated,     :boolean, default: true
      field :repository_id, :binary_id
      field :contexts,      {:array, :string}

      embeds_one :git,  Service.Git,  on_replace: :update
      embeds_one :helm, Service.Helm, on_replace: :update

      embeds_one :kustomize, Kustomize, on_replace: :update do
        field :path, :string
      end
    end

    @valid ~w(templated repository_id contexts)a

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, @valid)
      |> cast_embed(:git)
      |> cast_embed(:helm)
      |> cast_embed(:kustomize, with: &Service.kustomize_changeset/2)
    end
  end

  schema "managed_namespaces" do
    field :name,         :string
    field :description,  :string
    field :labels,       :map
    field :annotations,  :map
    field :pull_secrets, {:array, :string}
    field :deleted_at,   :utc_datetime_usec

    embeds_one :target,  Target, on_replace: :update

    belongs_to :service, ServiceTemplate, on_replace: :update

    has_many :clusters, NamespaceCluster,
      foreign_key: :namespace_id,
      on_replace: :delete

    has_many :instances, NamespaceInstance,
      foreign_key: :namespace_id,
      on_replace: :delete

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, %Cluster{} = cluster) do
    cluster = Console.Repo.preload(cluster, [:tags])
    tags = Map.new(cluster.tags, & {&1.name, &1.value})
    from(mn in query,
      left_join: nc in assoc(mn, :clusters),
      where: (is_nil(mn.target) or fragment("? = 'null'::jsonb", mn.target["tags"]) or fragment("?::jsonb <@ ?", ^tags, mn.target["tags"]))
                and (is_nil(mn.target) or fragment("? = 'null'::jsonb", mn.target["distro"]) or mn.target["distro"] == ^cluster.distro),
      or_where: nc.cluster_id == ^cluster.id,
      distinct: true
    )
  end

  def deleted(query \\ __MODULE__) do
    from(mn in query, where: not is_nil(mn.deleted_at))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(mn in query, order_by: ^order)
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:service]) do
    from(mn in query, preload: ^preloads)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(name description labels annotations pull_secrets)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:target)
    |> cast_assoc(:service)
    |> cast_assoc(:clusters)
    |> validate_required(~w(name)a)
  end
end
