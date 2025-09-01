defmodule Console.Schema.Group do
  use Piazza.Ecto.Schema
  alias Console.Schema.{RoleBinding, GroupMember}

  schema "groups" do
    field :name,        :string
    field :description, :string
    field :global,      :boolean

    has_many :members, GroupMember
    has_many :role_bindings, RoleBinding

    timestamps()
  end

  def with_names(query \\ __MODULE__, names) when is_list(names) do
    from(g in query, where: g.name in ^names)
  end

  def search(query \\ __MODULE__, name) do
    from(g in query, where: ilike(g.name, ^"%#{name}%"))
  end

  def global(query \\ __MODULE__) do
    from(g in query, where: g.global)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(m in query, order_by: ^order)
  end

  @valid ~w(name description global)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
    |> validate_required([:name])
  end
end
