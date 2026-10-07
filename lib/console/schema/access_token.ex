defmodule Console.Schema.AccessToken do
  use Piazza.Ecto.Schema
  alias Console.Schema.User

  schema "access_tokens" do
    field :token,        :string
    field :last_used_at, :utc_datetime_usec
    field :expires_at,   :utc_datetime_usec

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

  def expired(query \\ __MODULE__) do
    from(t in query, where: t.expires_at < ^Timex.now())
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(t in query, order_by: ^order)
  end

  @valid ~w(user_id last_used_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> cast_embed(:scopes, with: &scope_changeset/2)
    |> put_new_change(:token, fn -> "console-#{Console.rand_alphanum(30)}" end)
    |> save_expiry(attrs)
    |> validate_required(~w(user_id token)a)
  end

  def changeset(model, attrs, %User{allowed_scopes: allowed_scopes}) do
    model
    |> changeset(attrs)
    |> validate_allowed_scopes(allowed_scopes)
  end

  def scope_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(api apis ids identifier)a)
  end

  defp validate_allowed_scopes(changeset, [_ | _] = allowed_scopes) do
    requested_scopes =
      changeset
      |> get_field(:scopes, [])
      |> Enum.flat_map(fn scope -> List.wrap(scope.api) ++ List.wrap(scope.apis) end)
      |> MapSet.new()

    if MapSet.subset?(requested_scopes, MapSet.new(allowed_scopes)) do
      changeset
    else
      add_error(changeset, :scopes, "must be a subset of the service account's allowed scopes")
    end
  end
  defp validate_allowed_scopes(changeset, _), do: changeset

  defp save_expiry(cs, %{expiry: expiry}) when is_binary(expiry) do
    case Console.convert_duration(expiry) do
      {:ok, expiry} ->
        put_change(cs, :expires_at, Timex.add(Timex.now(), expiry))
      {:error, err} ->
        add_error(cs, :expires_at, err)
    end
  end
  defp save_expiry(cs, _), do: cs
end
