defmodule Console.Schema.ManagedNamespace do
  use Piazza.Ecto.Schema
  alias Console.Schema.{NamespaceCluster, NamespaceInstance, GlobalService, Cluster, ServiceTemplate}

  defmodule Target do
    use Piazza.Ecto.Schema

    embedded_schema do
      field :distro, Console.Schema.Cluster.Distro
      field :tags,   {:map, :string}
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(distro tags)a)
    end
  end

  schema "managed_namespaces" do
    field :name,           :string
    field :namespace,      :string
    field :description,    :string
    field :labels,         :map
    field :annotations,    :map
    field :pull_secrets,   {:array, :string}
    field :deleted_at,     :utc_datetime_usec

    embeds_one :target,  Target, on_replace: :update
    embeds_one :cascade, GlobalService.Cascade, on_replace: :update

    belongs_to :project, Project
    belongs_to :service, ServiceTemplate, on_replace: :update

    has_many :clusters, NamespaceCluster,
      foreign_key: :namespace_id,
      on_replace: :delete

    has_many :instances, NamespaceInstance,
      foreign_key: :namespace_id,
      on_replace: :delete

    timestamps()
  end

  def for_project(query \\ __MODULE__, id) do
    from(g in query, where: g.project_id == ^id)
  end

  def for_cluster(query \\ __MODULE__, %Cluster{} = cluster) do
    cluster = Console.Repo.preload(cluster, [:tags])
    tags = Map.new(cluster.tags, & {&1.name, &1.value})
    from(mn in query,
      left_join: nc in assoc(mn, :clusters),
      where: (is_nil(mn.target) or fragment("? = 'null'::jsonb", mn.target["tags"]) or fragment("?::jsonb <@ ?", ^tags, mn.target["tags"]))
                and (is_nil(mn.target) or fragment("? = 'null'::jsonb", mn.target["distro"]) or mn.target["distro"] == ^cluster.distro)
                and (is_nil(mn.project_id) or mn.project_id == ^cluster.project_id),
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

  def preloaded(query \\ __MODULE__, preloads \\ [service: :dependencies]) do
    from(mn in query, preload: ^preloads)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(name namespace description project_id labels annotations pull_secrets)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:target)
    |> cast_embed(:cascade, with: &GlobalService.cascade_changeset/2)
    |> cast_assoc(:service)
    |> cast_assoc(:clusters)
    |> unique_constraint(:name)
    |> validate_required(~w(name)a)
  end
end
