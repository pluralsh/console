defmodule Console.Schema.CloudAddon do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  schema "cloud_addons" do
    field :distro,  Cluster.Distro
    field :name,    :string
    field :version, :string

    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cid) do
    from(ca in query, where: ca.cluster_id == ^cid)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(ca in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name distro version cluster_id)a)
    |> unique_constraint([:cluster_id, :name])
    |> validate_required(~w(name distro version)a)
  end
end
