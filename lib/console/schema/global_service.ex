defmodule Console.Schema.GlobalService do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, Cluster, ClusterProvider, ServiceTemplate}

  schema "global_services" do
    field :reparent, :boolean
    field :name,     :string
    field :distro,   Cluster.Distro

    embeds_many :tags, Tag, on_replace: :delete do
      field :name,  :string
      field :value, :string
    end

    belongs_to :template, ServiceTemplate, on_replace: :update
    belongs_to :service,  Service
    belongs_to :provider, ClusterProvider

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(g in query, order_by: ^order)
  end

  def preloaded(query \\ __MODULE__, preloads \\ [template: :dependencies, service: :dependencies]) do
    from(g in query, preload: ^preloads)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(name reparent service_id distro provider_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:template)
    |> cast_embed(:tags, with: &tag_changeset/2)
    |> unique_constraint(:service_id)
    |> unique_constraint(:name)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:provider_id)
    |> validate_required(~w(name)a)
    |> validate_one_present([:service_id, :template])
  end

  def tag_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name value)a)
    |> validate_required(~w(name value)a)
  end
end
