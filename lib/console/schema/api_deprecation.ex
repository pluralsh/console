defmodule Console.Schema.ApiDeprecation do
  use Piazza.Ecto.Schema
  alias Console.Schema.ServiceComponent

  schema "api_deprecations" do
    field :deprecated_in, :string
    field :removed_in,    :string
    field :replacement,   :string
    field :available_in,  :string

    belongs_to :component, ServiceComponent

    timestamps()
  end

  @valid ~w(deprecated_in removed_in replacement available_in)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:component_id, :replacement])
  end
end
