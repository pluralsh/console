defmodule Console.Schema.PostgresInstance do
  use Piazza.Ecto.Schema

  schema "postgres_instances" do
    field :namespace, :string
    field :name,      :string
    field :uid,       :string

    timestamps()
  end

  def for_namespace(query \\ __MODULE__, ns) do
    from(i in query, where: i.namespace == ^ns)
  end

  def for_name(query \\ __MODULE__, name) do
    from(i in query, where: i.name == ^name)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(i in query, order_by: ^order)
  end

  @valid ~w(namespace name uid)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
    |> unique_constraint([:namespace, :name, :uid])
  end
end
