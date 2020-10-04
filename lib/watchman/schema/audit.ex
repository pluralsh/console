defmodule Watchman.Schema.Audit do
  use Piazza.Ecto.Schema
  alias Watchman.Schema.{User, Build}

  defenum Type, build: 0
  schema "audits" do
    field :type, Type

    belongs_to :creator, User
    belongs_to :build, Build

    timestamps()
  end

  @valid ~w(creator_id build_id type)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:build_id)
    |> validate_required([:creator_id, :type])
  end
end