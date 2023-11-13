defmodule Console.Schema.ClusterRevision do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, ClusterNodePool}

  schema "cluster_revisions" do
    field :version, :string

    embeds_many :node_pools, ClusterNodePool, on_replace: :delete
    embeds_one  :cloud_settings, Cluster.CloudSettings, on_replace: :update
    belongs_to  :cluster, Cluster

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(cr in query, where: cr.cluster_id == ^cluster_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(cr in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:version])
    |> cast_embed(:node_pools)
    |> cast_embed(:cloud_settings)
  end
end
