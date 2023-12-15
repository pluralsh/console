defmodule Console.Schema.ServiceComponent do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, ApiDeprecation}

  defenum State, running: 0, pending: 1, failed: 2, paused: 3

  schema "service_components" do
    field :state,      State
    field :synced,     :boolean
    field :group,      :string
    field :version,    :string
    field :kind,       :string
    field :namespace,  :string
    field :name,       :string

    belongs_to :service, Service
    has_many :api_deprecations, ApiDeprecation, foreign_key: :component_id

    timestamps()
  end

  def for_service(query \\ __MODULE__, service_id) do
    from(sc in query, where: sc.service_id == ^service_id)
  end

  @valid ~w(state synced group version kind namespace name)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:service)
    |> validate_required([:kind, :name])
  end
end
