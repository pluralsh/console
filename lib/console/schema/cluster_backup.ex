defmodule Console.Schema.ClusterBackup do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  schema "cluster_backups" do
    field :name,              :string
    field :namespace,         :string
    field :garbage_collected, :boolean

    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(cb in query, where: cb.cluster_id == ^cluster_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(cb in query, order_by: ^order)
  end

  @valid ~w(name namespace cluster_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(~w(cluster_id namespace name)a)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required(@valid)
  end
end
