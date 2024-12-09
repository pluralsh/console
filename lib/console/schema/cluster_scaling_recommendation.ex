defmodule Console.Schema.ClusterScalingRecommendation do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, Service}

  defenum Type, deployment: 0, statefulset: 1, daemonset: 2, rollout: 3

  schema "cluster_scaling_recommendations" do
    field :type,         Type
    field :namespace,    :string
    field :name,         :string
    field :container,    :string

    field :memory_request, :float
    field :cpu_request,    :float

    field :memory_recommendation, :float
    field :cpu_recommendation,    :float

    belongs_to :cluster, Cluster
    belongs_to :service, Service

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cid) do
    from(csr in query, where: csr.cluster_id == ^cid)
  end

  def for_service(query \\ __MODULE__, sid) do
    from(csr in query, where: csr.service_id == ^sid)
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:cluster]) do
    from(cu in query, preload: ^preloads)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :namespace, asc: :type, asc: :name, asc: :container]) do
    from(csr in query, order_by: ^order)
  end

  @valid ~w(type namespace name container cpu_request memory_request memory_recommendation cpu_recommendation)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
  end
end
