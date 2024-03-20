defmodule Console.Schema.NamespaceInstance do
  use Piazza.Ecto.Schema
  alias Console.Schema.{ManagedNamespace, Service, Cluster}

  schema "namespace_instances" do
    belongs_to :cluster,   Cluster
    belongs_to :service,   Service
    belongs_to :namespace, ManagedNamespace

    timestamps()
  end

  def for_namespace(query \\ __MODULE__, ns) do
    from(ni in query, where: ni.namespace_id == ^ns)
  end

  def undeleted(query \\ __MODULE__) do
    from(ni in query,
      join: s in assoc(ni, :service),
      where: is_nil(s.deleted_at)
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :cluster_id]) do
    from(ni in query, order_by: ^order)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(cluster_id service_id namespace_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:namespace_id)
    |> validate_required(~w(cluster_id service_id)a)
  end
end
