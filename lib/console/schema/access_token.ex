defmodule Console.Schema.AccessToken do
  use Piazza.Ecto.Schema
  alias Console.Schema.User

  schema "access_tokens" do
    field :token,        :string
    field :last_used_at, :utc_datetime_usec

    embeds_many :scopes, Scope, on_replace: :delete do
      field :apis,       {:array, :string}
      field :api,        :string
      field :identifier, :string
      field :ids,        {:array, :string}
    end

    belongs_to :user,    User

    timestamps()
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(t in query, where: t.user_id == ^user_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(t in query, order_by: ^order)
  end

  @valid ~w(user_id last_used_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:token_id)
    |> cast_embed(:scopes, with: &scope_changeset/2)
    |> put_new_change(:token, fn -> "console-#{Console.rand_alphanum(30)}" end)
    |> validate_required(~w(user_id token)a)
  end

  def scope_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(api apis ids identifier)a)
  end
end
