defmodule Console.Schema.Chat do
  use Piazza.Ecto.Schema
  alias Console.Schema.User

  defenum Role, user: 0, assistant: 1, system: 2

  schema "chats" do
    field :role,    Role
    field :content, :string
    field :seq,     :integer

    belongs_to :user, User

    timestamps()
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(c in query, where: c.user_id == ^user_id)
  end

  def rollup(query \\ __MODULE__) do
    from(c in query, where: c.seq < 0)
  end

  def before(query \\ __MODULE__, seq)
  def before(query, nil), do: query
  def before(query, seq) when is_integer(seq), do: from(c in query, where: c.seq <= ^seq)

  def summarizable(query \\ __MODULE__) do
    from(c in query, where: c.inserted_at < ^expiry() or c.seq < 0)
  end

  def expired(query \\ __MODULE__) do
    from(c in query, where: c.inserted_at < ^expiry())
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :seq, asc: :inserted_at]) do
    from(c in query, order_by: ^order)
  end

  defp expiry(), do: Timex.now() |> Timex.shift(days: -5)

  @valid ~w(user_id role content seq)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> validate_required(@valid)
  end
end
