defmodule Console.Schema.ClusterUsageHistory do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

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

  def for_cluster(query \\ __MODULE__, cid) do
    from(cu in query,
      where: cu.cluster_id == ^cid
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :timestamp]) do
    from(cu in query, order_by: ^order)
  end

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(days: -14)
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
