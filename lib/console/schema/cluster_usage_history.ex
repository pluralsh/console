defmodule Console.Schema.ClusterUsageHistory do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, User}

  schema "cluster_usage_history" do
    field :timestamp,   :utc_datetime_usec
    field :memory,      :float
    field :cpu,         :float
    field :storage,     :float
    field :gpu,         :float

    field :cpu_cost,           :float
    field :memory_cost,        :float
    field :gpu_cost,           :float
    field :node_cost,          :float
    field :control_plane_cost, :float
    field :storage_cost,       :float

    field :memory_util, :float
    field :cpu_util,    :float
    field :gpu_util,    :float

    field :load_balancer_cost, :float
    field :ingress_cost,       :float
    field :egress_cost,        :float

    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    from(cu in query,
      join: c in ^Cluster.for_user(user),
        on: c.id == cu.cluster_id,
        as: :cluster
    )
  end

  def aggregated(query \\ __MODULE__) do
    from([cu, cluster: c] in query,
      group_by: [c.project_id, cu.timestamp],
      order_by: [asc: cu.timestamp],
      select: %{
        timestamp: cu.timestamp,
        project_id: c.project_id,
        cpu: sum(cu.cpu),
        memory: sum(cu.memory),
        cpu_cost: sum(cu.cpu_cost),
        memory_cost: sum(cu.memory_cost),
        gpu_cost: sum(cu.gpu_cost),
        node_cost: sum(cu.node_cost),
        control_plane_cost: sum(cu.control_plane_cost),
        storage_cost: sum(cu.storage_cost),
        ingress_cost: sum(cu.ingress_cost),
        egress_cost: sum(cu.egress_cost),
        load_balancer_cost: sum(cu.load_balancer_cost)
      }
    )
  end
  def for_cluster(query \\ __MODULE__, cid) do
    from(cu in query,
      where: cu.cluster_id == ^cid
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :timestamp]) do
    from(cu in query, order_by: ^order)
  end

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(days: -365)
    from(cu in query, where: cu.timestamp <= ^expiry)
  end

  @valid ~w(
    timestamp
    memory
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
    storage_cost
  )a

  def fields(), do: @valid

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:cluster_id)
  end
end
