defmodule Console.Schema.GroupMember do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, Group}

  schema "group_members" do
    belongs_to :user,  User
    belongs_to :group, Group

    timestamps()
  end

  def for_group(query \\ __MODULE__, group_id) do
    from(m in query, where: m.group_id == ^group_id)
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(m in query, where: m.user_id == ^user_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :id]) do
    from(m in query, order_by: ^order)
  end

  @valid ~w(group_id user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:group_id)
    |> unique_constraint([:group_id, :user_id])
    |> validate_required([:group_id, :user_id])
  end
end
