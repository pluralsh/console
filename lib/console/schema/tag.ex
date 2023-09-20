defmodule Console.Schema.Tag do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, Service}

  schema "tags" do
    field :name,  :string
    field :value, :string

    belongs_to :cluster, Cluster
    belongs_to :service, Service

    timestamps()
  end

  def as_map(tags), do: Map.new(tags, & {&1.name, &1.value})

  @valid ~w(name value cluster_id service_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> unique_constraint([:cluster_id, :name])
    |> unique_constraint([:service_id, :name])
    |> validate_required([:name, :value])
  end
end
