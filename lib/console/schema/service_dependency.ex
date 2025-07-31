defmodule Console.Schema.ServiceDependency do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, ServiceTemplate}

  schema "service_dependencies" do
    field :name,   :string
    field :status, Service.Status, default: :stale

    belongs_to :service,  Service
    belongs_to :template, ServiceTemplate

    timestamps()
  end

  def pending(query \\ __MODULE__) do
    from(d in query, where: not is_nil(d.service_id) and is_nil(d.status) or d.status != ^:healthy)
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(d in query,
      join: s in assoc(d, :service),
      where: s.cluster_id == ^cluster_id
    )
  end

  def for_name(query \\ __MODULE__, name) do
    from(d in query, where: d.name == ^name)
  end

  @valid ~w(name status service_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:service_id)
    |> validate_required([:name])
  end
end
