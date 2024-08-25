defmodule Console.Schema.SharedSecret do
  use Piazza.Ecto.Schema
  alias Console.Schema.PolicyBinding

  schema "shared_secrets" do
    field :name,       :string
    field :handle,     :string
    field :secret,     Piazza.Ecto.EncryptedString
    field :expires_at, :utc_datetime_usec

    has_many :notification_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :id

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name secret expires_at)a)
    |> cast_assoc(:notification_bindings)
    |> put_new_change(:handle, &gen_token/0)
    |> put_new_change(:expires_at, fn -> Timex.now() |> Timex.shift(days: 7) end)
    |> validate_required(~w(name handle secret expires_at)a)
  end

  defp gen_token() do
    "plrl-secret-" <>
    (:crypto.strong_rand_bytes(64)
    |> Base.url_encode64())
  end
end
