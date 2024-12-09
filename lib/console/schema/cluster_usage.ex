defmodule Console.Schema.ClusterUsage do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  schema "cluster_usage" do
    field :memory,      :float
    field :cpu,         :float
    field :storage,     :float

    field :memory_util, :float
    field :cpu_util,    :float

    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_user(query \\ __MODULE__, user) do
    from(cu in query,
      join: c in ^Cluster.for_user(user),
        on: c.id == cu.cluster_id,
        as: :clusters,
      distinct: true
    )
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:cluster]) do
    from(cu in query, preload: ^preloads)
  end

  def ordered(query \\ __MODULE__) do
    from(cu in query, order_by: [asc: :cluster_id])
  end

  @valid ~w(memory cpu storage cluster_id memory_util cpu_util)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:cluster_id)
  end
end
