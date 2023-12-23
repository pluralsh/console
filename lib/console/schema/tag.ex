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

  def cluster(query \\ __MODULE__), do: from(t in query, where: not is_nil(t.cluster_id))

  def for_name(query \\ __MODULE__, name), do: from(t in query, where: t.name == ^name)

  def ordered(query \\ __MODULE__, order \\ [asc: :name]), do: from(t in query, order_by: ^order)

  def select(query \\ __MODULE__, field) do
    from(t in query,
      select: field(t, ^field),
      distinct: true
    )
  end

  def as_map([_ | _] = tags), do: Map.new(tags, & {&1.name, &1.value})
  def as_map(_), do: %{}

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
