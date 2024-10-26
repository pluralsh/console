defmodule Console.Schema.ChatSequence do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User}

  schema "chat_sequences" do
    field :counter, :integer, default: 0

    belongs_to :user, User
  end

  @valid ~w(user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> validate_required(@valid)
  end
end
