defmodule Console.Schema.ClusterNamespaceUsage do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  schema "cluster_namespace_usage" do
    field :namespace,  :string
    field :memory,     :float
    field :cpu,        :float
    field :storage,    :float

    field :memory_util, :float
    field :cpu_util,    :float

    belongs_to :cluster, Cluster

    timestamps()
  end

  @valid ~w(memory cpu storage namespace cluster_id memory_util cpu_util)a

  def preloaded(query \\ __MODULE__, preloads \\ [:cluster]) do
    from(cu in query, preload: ^preloads)
  end

  def for_cluster(query \\ __MODULE__, cid) do
    from(cn in query, where: cn.cluster_id == ^cid)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :namespace]) do
    from(cn in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:cluster_id)
  end
end
