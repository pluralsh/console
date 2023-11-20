defmodule Console.Schema.RuntimeService do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, Cluster}

  schema "runtime_services" do
    field :name,    :string
    field :version, :string

    belongs_to :service, Service
    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(rs in query, where: rs.cluster_id == ^cluster_id)
  end

  def for_service(query \\ __MODULE__, service_id) do
    from(rs in query, where: rs.service_id == ^service_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(rs in query, order_by: ^order)
  end

  @valid ~w(name version service_id cluster_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint([:name, :version])
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required([:name, :version, :cluster_id])
  end
end
