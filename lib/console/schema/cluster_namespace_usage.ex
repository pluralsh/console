defmodule Console.Schema.ClusterNamespaceUsage do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  schema "cluster_namespace_usage" do
    field :namespace,  :string
    field :memory,     :float
    field :cpu,        :float
    field :storage,    :float
    field :gpu,        :float

    field :cpu_cost,    :float
    field :memory_cost, :float
    field :gpu_cost,    :float

    field :memory_util, :float
    field :cpu_util,    :float

    field :load_balancer_cost, :float
    field :ingress_cost,       :float
    field :egress_cost,        :float

    belongs_to :cluster, Cluster

    timestamps()
  end

  def search(query \\ __MODULE__, q) do
    from(cu in query, where: like(cu.namespace, ^"%#{q}%"))
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:cluster]) do
    from(cu in query, preload: ^preloads)
  end

  def for_cluster(query \\ __MODULE__, cid) do
    from(cn in query, where: cn.cluster_id == ^cid)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :namespace]) do
    from(cn in query, order_by: ^order)
  end

  @valid ~w(
    memory
    cpu
    gpu
    storage
    namespace
    cluster_id
    memory_util
    cpu_util
    gpu_util
    cpu_cost
    memory_cost
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
