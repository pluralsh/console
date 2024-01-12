defmodule Console.Schema.ScmWebhook do
  use Piazza.Ecto.Schema

  schema "scm_webhooks" do
    field :name,        :string
    field :type,        Console.Schema.ScmConnection.Type
    field :hmac,        Piazza.Ecto.EncryptedString
    field :external_id, :string

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(w in query, order_by: ^order)
  end

  @valid ~w(name type hmac external_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:external_id, fn -> Console.rand_alphanum(30) end)
    |> validate_required(~w(name type hmac external_id)a)
  end
end
