defmodule Console.Schema.ClusterUsage do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  schema "cluster_usage" do
    field :memory,      :float
    field :cpu,         :float
    field :storage,     :float
    field :gpu,         :float

    field :cpu_cost,           :float
    field :memory_cost,        :float
    field :gpu_cost,           :float
    field :node_cost,          :float
    field :control_plane_cost, :float

    field :memory_util, :float
    field :cpu_util,    :float
    field :gpu_util,    :float

    field :load_balancer_cost, :float
    field :ingress_cost,       :float
    field :egress_cost,        :float

    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_clusters(query \\ __MODULE__, cluster_q) do
    from(cu in query,
      join: c in subquery(cluster_q),
        on: c.id == cu.cluster_id,
        as: :clusters,
      distinct: true
    )
  end

  def for_user(query \\ __MODULE__, user) do
    from(cu in query,
      join: c in ^Cluster.for_user(user),
        on: c.id == cu.cluster_id,
        as: :clusters,
      distinct: true
    )
  end

  def for_cluster(query \\ __MODULE__, cid) do
    from(cu in query,
      where: cu.cluster_id == ^cid
    )
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:cluster]) do
    from(cu in query, preload: ^preloads)
  end

  def ordered(query \\ __MODULE__) do
    from(cu in query, order_by: [asc: :cluster_id])
  end

  @valid ~w(memory
    cpu
    gpu
    storage
    cluster_id
    memory_util
    cpu_util
    gpu_util
    cpu_cost
    memory_cost
    node_cost
    control_plane_cost
    gpu_cost
    load_balancer_cost
    ingress_cost
    egress_cost
  )a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:cluster_id)
  end
end
