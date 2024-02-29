defmodule Console.Schema.RefreshToken do
  use Piazza.Ecto.Schema
  alias Console.Schema.User

  @expiry [days: -7]

  schema "refresh_tokens" do
    field :token, :string

    belongs_to :user, User

    timestamps()
  end

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(@expiry)
    from(rt in query, where: rt.inserted_at <= ^expiry)
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(rt in query, where: rt.user_id == ^user_id)
  end

  @valid ~w(user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:token, fn -> Console.rand_alphanum(32) end)
    |> foreign_key_constraint(:user_id)
    |> validate_required(~w(token user_id)a)
  end
end
