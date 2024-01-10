defmodule Console.Schema.GlobalService do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, Cluster, ClusterProvider}

  schema "global_services" do
    field :name, :string
    field :distro, Cluster.Distro

    embeds_many :tags, Tag, on_replace: :delete do
      field :name,  :string
      field :value, :string
    end

    belongs_to :service,  Service
    belongs_to :provider, ClusterProvider

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(g in query, order_by: ^order)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(name service_id distro provider_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:tags, with: &tag_changeset/2)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:provider_id)
    |> validate_required(~w(name service_id)a)
  end

  def tag_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name value)a)
    |> validate_required(~w(name value)a)
  end
end
