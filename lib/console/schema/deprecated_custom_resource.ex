defmodule Console.Schema.DeprecatedCustomResource do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster}

  defenum Status, active: 0, deprecated: 1

  schema "deprecated_custom_resources" do
    field :group,        :string
    field :version,      :string
    field :kind,         :string
    field :namespace,    :string
    field :name,         :string
    field :next_version, :string

    belongs_to :cluster, Cluster

    timestamps()
  end

  def search(query \\ __MODULE__, q) do
    search_field = "%#{q}%  "
    from(d in query, where: ilike(d.group, ^search_field)
      or ilike(d.kind, ^search_field)
      or (not is_nil(d.namespace) and ilike(d.namespace, ^search_field))
      or ilike(d.name, ^search_field)
    )
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(d in query, where: d.cluster_id == ^cluster_id)
  end

  def ordered(query \\ __MODULE__) do
    from(d in query, order_by: [asc: :group, asc: :version, asc: :kind, asc: :namespace, asc: :name])
  end

  @valid ~w(group version kind namespace name next_version cluster_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid -- ~w(cluster_id namespace)a)
    |> foreign_key_constraint(:cluster_id)
  end
end
