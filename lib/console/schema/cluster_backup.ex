defmodule Console.Schema.ClusterBackup do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  defmodule ResourceSelector do
    use Piazza.Ecto.Schema

    embedded_schema do
      field :included, {:array, :string}
      field :excluded, {:array, :string}
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(included excluded)a)
    end
  end

  schema "cluster_backups" do
    field :name,              :string
    field :namespace,         :string
    field :garbage_collected, :boolean
    field :ttl,               :string

    embeds_one :namespaces, ResourceSelector, on_replace: :update
    embeds_one :resources,  ResourceSelector, on_replace: :update

    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(cb in query, where: cb.cluster_id == ^cluster_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(cb in query, order_by: ^order)
  end

  @valid ~w(name namespace cluster_id ttl)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:namespaces)
    |> cast_embed(:resources)
    |> unique_constraint(~w(cluster_id namespace name)a)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required(~w(name namespace cluster_id)a)
  end
end
