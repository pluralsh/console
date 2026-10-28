defmodule Console.Schema.ComponentContent do
  use Console.Schema.Base
  alias Console.Schema.{ServiceComponent}

  schema "component_contents" do
    field :desired, :binary
    field :live, :binary

    belongs_to :component, ServiceComponent

    timestamps()
  end

  @valid ~w(desired live component_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:component_id)
    |> unique_constraint(:component_id)
    |> validate_required([:desired])
  end
end
