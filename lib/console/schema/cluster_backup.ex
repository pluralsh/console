defmodule Console.Schema.ClusterBackup do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  schema "cluster_backups" do
    field :name, :string

    belongs_to :cluster, Cluster

    timestamps()
  end

  @valid ~w(name)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end
end
