defmodule Console.Schema.ChatSequence do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, ChatThread}

  schema "chat_sequences" do
    field :counter, :integer, default: 0

    belongs_to :user,   User
    belongs_to :thread, ChatThread
  end

  @valid ~w(user_id thread_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:thread_id)
    |> validate_required(@valid)
  end
end
