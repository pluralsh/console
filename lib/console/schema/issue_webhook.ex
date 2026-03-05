defmodule Console.Schema.IssueWebhook do
  use Console.Schema.Base

  defenum Provider, linear: 0, jira: 1, asana: 2, github: 3, gitlab: 4

  schema "issue_webhooks" do
    field :provider,    Provider
    field :external_id, :string
    field :url,         :string
    field :name,        :string
    field :secret,      Piazza.Ecto.EncryptedString

    timestamps()
  end

  def url(%__MODULE__{external_id: ext_id, provider: p}),
    do: Console.Deployments.Notifications.webhook_url("/v1/webhooks/issues/#{p}/#{ext_id}")

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(w in query, order_by: ^order)
  end

  @valid ~w(provider url name secret)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:external_id, &gen_external_id/0)
    |> validate_required([:provider, :url, :name, :secret])
    |> unique_constraint(:url)
    |> unique_constraint(:name)
    |> unique_constraint(:external_id)
  end

  defp gen_external_id() do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64()
    |> String.replace("/", "")
  end
end
