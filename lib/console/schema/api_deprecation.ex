defmodule Console.Schema.ApiDeprecation do
  use Piazza.Ecto.Schema
  alias Console.Schema.ServiceComponent

  schema "api_deprecations" do
    field :deprecated_in, :string
    field :removed_in,    :string
    field :replacement,   :string
    field :available_in,  :string
    field :blocking,      :boolean

    belongs_to :component, ServiceComponent

    timestamps()
  end

  def for_service(query \\ __MODULE__, service_id) do
    from(d in query,
      join: c in assoc(d, :component),
      where: c.service_id == ^service_id
    )
  end

  @valid ~w(deprecated_in removed_in replacement available_in blocking)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:component_id, :replacement])
  end
end
