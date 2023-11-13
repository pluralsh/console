defmodule Console.Schema.NamespacedName do
  use Piazza.Ecto.Schema

  embedded_schema do
    field :name,      :string
    field :namespace, :string
  end

  @valid ~w(name namespace)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end
end
