defmodule Console.Schema.NamespaceCluster do
  use Piazza.Ecto.Schema
  alias Console.Schema.{ManagedNamespace, Cluster}

  schema "namespace_clusters" do
    belongs_to :namespace, ManagedNamespace
    belongs_to :cluster,   Cluster
  end

  @valid ~w(namespace_id cluster_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:namespace_id)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required([:cluster_id])
  end
end
