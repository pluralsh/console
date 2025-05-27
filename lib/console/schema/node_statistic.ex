defmodule Console.Schema.NodeStatistic do
  use Piazza.Ecto.Schema

  defenum Health, healthy: 0, warning: 1,failed: 2

  schema "node_statistics" do
    field :name,         :string
    field :pending_pods, :integer
    field :health,       Health

    belongs_to :cluster, Cluster

    timestamps()
  end

  @valid ~w(name pending_pods health)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
    |> unique_constraint([:cluster_id, :name])
  end
end
