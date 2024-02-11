defmodule Console.Schema.ScmWebhook do
  use Piazza.Ecto.Schema

  schema "scm_webhooks" do
    field :type,        Console.Schema.ScmConnection.Type
    field :hmac,        Piazza.Ecto.EncryptedString
    field :owner,       :string
    field :external_id, :string

    timestamps()
  end

  def url(%__MODULE__{external_id: ext_id, type: t}),
    do: Console.url("/ext/v1/webhooks/#{t}/#{ext_id}")

  def name(%__MODULE__{id: id}), do: "plrl-#{id}"

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(w in query, order_by: ^order)
  end

  @valid ~w(type hmac external_id owner)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:external_id, fn -> Console.rand_alphanum(30) end)
    |> put_new_change(:hmac, fn -> Console.rand_str(32) end)
    |> validate_required(~w(type hmac external_id)a)
  end
end
