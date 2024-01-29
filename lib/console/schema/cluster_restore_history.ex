defmodule Console.Schema.ClusterRestoreHistory do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, ClusterRestore}

  schema "cluster_restore_history" do
    belongs_to :cluster, Cluster
    belongs_to :restore, ClusterRestore

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(cr in query, where: cr.cluster_id == ^cluster_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(cr in query, order_by: ^order)
  end

  @valid ~w(cluster_id restore_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:restore_id)
    |> validate_required(@valid)
  end
end
