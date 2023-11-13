defmodule Console.Schema.PolicyBinding do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, Group}

  schema "policy_bindings" do
    field :policy_id, :binary_id
    belongs_to :user, User
    belongs_to :group, Group

    timestamps()
  end

  @valid ~w(user_id group_id policy_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:group_id)
  end
end
